import { login, listProcesses, exportJourney, findProcessByNameAndDate } from './api.js';

const PORT = process.env.PORT || 3000;
const PROCESS_NAME = "Planilha de Jornadas V2";
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get yesterday's date range in ISO format with timezone
 * @returns {Object} { startDate, endDate } in ISO format
 */
function getYesterdayDateRange() {
  const now = new Date();
  
  // Set to yesterday at 00:00:00
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  // Set to yesterday at 23:59:59
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);
  
  return {
    startDate: yesterday.toISOString(),
    endDate: yesterdayEnd.toISOString(),
    startTimestamp: yesterday.getTime(),
    endTimestamp: yesterdayEnd.getTime()
  };
}

/**
 * Poll for process completion
 * @param {Object} authData - Authentication data
 * @param {number} startTimestamp - Start of date range to filter processes
 * @param {number} endTimestamp - End of date range to filter processes
 * @returns {Promise<Object>} Completed process with resultFileUrl
 */
async function pollForCompletion(authData, startTimestamp, endTimestamp) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    // Wait before checking
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    
    // Get process list
    const result = await listProcesses(authData);
    
    // Find matching process
    const process = findProcessByNameAndDate(result.list, PROCESS_NAME, startTimestamp, endTimestamp);
    
    if (!process) {
      continue; // Keep polling
    }
    
    const state = process.state?.id || process.status?.state?.id;
    
    if (state === 'COMPLETED') {
      return process;
    }
    
    if (state === 'ERROR' || state === 'CANCELLED') {
      throw new Error(`Process failed with state: ${state}`);
    }
    
    // States: SCHEDULED, WAITING, PROCESSING - keep polling
  }
  
  throw new Error('Polling timeout: Process did not complete within 5 minutes');
}

/**
 * Main handler for journey export endpoint
 * @param {Object} requestBody - Request body with email and password
 * @returns {Promise<Object>} Response object
 */
async function handleJourneyExport(requestBody) {
  const { email, password } = requestBody;
  
  // Validate request
  if (!email || !password) {
    return {
      success: false,
      error: 'Email and password are required',
      statusCode: 400
    };
  }
  
  try {
    // Step 1: Authenticate
    const authData = await login(email, password);
    
    // Step 2: Get yesterday's date range
    const { startDate, endDate, startTimestamp, endTimestamp } = getYesterdayDateRange();
    
    // Step 3: Check if process already exists for yesterday
    const processListResult = await listProcesses(authData);
    const existingProcess = findProcessByNameAndDate(
      processListResult.list, 
      PROCESS_NAME, 
      startTimestamp, 
      endTimestamp
    );
    
    // Step 4: If exists and completed, return immediately
    if (existingProcess) {
      const state = existingProcess.state?.id || existingProcess.status?.state?.id;
      
      if (state === 'COMPLETED') {
        const url = existingProcess.resultFileUrl || existingProcess.status?.resultFileUrl;
        return {
          success: true,
          url,
          processId: existingProcess.id,
          processName: existingProcess.name,
          statusCode: 200
        };
      }
      
      // If exists but not completed, poll for completion
      if (state === 'SCHEDULED' || state === 'WAITING' || state === 'PROCESSING') {
        const completedProcess = await pollForCompletion(authData, startTimestamp, endTimestamp);
        const url = completedProcess.resultFileUrl || completedProcess.status?.resultFileUrl;
        
        return {
          success: true,
          url,
          processId: completedProcess.id,
          processName: completedProcess.name,
          statusCode: 200
        };
      }
    }
    
    // Step 5: Trigger new export for yesterday
    await exportJourney(authData, startDate, endDate);
    
    // Step 6: Poll until completion
    const completedProcess = await pollForCompletion(authData, startTimestamp, endTimestamp);
    const url = completedProcess.resultFileUrl || completedProcess.status?.resultFileUrl;
    
    return {
      success: true,
      url,
      processId: completedProcess.id,
      processName: completedProcess.name,
      statusCode: 200
    };
    
  } catch (error) {
    console.error('Error in journey export:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('Login failed')) {
      return {
        success: false,
        error: 'Authentication failed: Invalid credentials',
        statusCode: 401
      };
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: 500
    };
  }
}

/**
 * Simple router
 */
async function handleRequest(req) {
  const url = new URL(req.url);
  
  // Health check endpoint
  if (url.pathname === '/health' && req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Main export endpoint
  if (url.pathname === '/api/journey-export' && req.method === 'POST') {
    try {
      const body = await req.json();
      const result = await handleJourneyExport(body);
      
      const { statusCode, ...responseData } = result;
      
      return new Response(JSON.stringify(responseData), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // 404 for other routes
  return new Response(JSON.stringify({
    success: false,
    error: 'Not found'
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Start the server
const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`🚀 MaxTrack Export API running on http://localhost:${server.port}`);
console.log(`📊 Health check: http://localhost:${server.port}/health`);
console.log(`📤 Export endpoint: POST http://localhost:${server.port}/api/journey-export`);
