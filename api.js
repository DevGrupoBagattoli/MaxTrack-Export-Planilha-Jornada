/**
 * API client for MaxTrack integration
 * Handles authentication, process listing, and journey export
 */

/**
 * Authenticate with MaxTrack API
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Authentication data including cookie and empresa info
 */
export async function login(email, password) {
  const url = 'https://go.maxtrack.com.br/security/login';
  
  const body = {
    email,
    senha: password,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    so: 'Win32'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Login failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Extract PLAY_SESSION cookie from Set-Cookie header
  const setCookieHeader = response.headers.get('set-cookie');
  const playSessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : null;
  
  if (!playSessionCookie) {
    throw new Error('No session cookie received from login');
  }

  return {
    ...data,
    playSessionCookie
  };
}

/**
 * List processes from MaxTrack
 * @param {Object} authData - Authentication data from login
 * @param {Array<string>} states - Process states to filter (default: all states)
 * @returns {Promise<Object>} Process list response
 */
export async function listProcesses(authData, states = ["SCHEDULED", "WAITING", "PROCESSING", "COMPLETED", "ERROR", "CANCELLED"]) {
  const url = 'https://go.maxtrack.com.br/general/pm/list';
  
  const body = {
    model: {
      onlyActive: true,
      justMine: false,
      states
    },
    page: 0,
    pageSize: 100,
    parameters: {
      errors: []
    },
    sort: "createDate desc"
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authData.playSessionCookie,
      'cco': authData.empresa.uid,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`List processes failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Export journey data with date filters
 * @param {Object} authData - Authentication data from login
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @returns {Promise<Object>} Export response
 */
export async function exportJourney(authData, startDate, endDate) {
  const url = 'https://go.maxtrack.com.br/journey/journey/exportv2';
  
  const body = {
    search: {
      id: null,
      validateFilter: null,
      startDate,
      endDate,
      state: null,
      sourceId: null,
      registerType: null,
      identifiers: null,
      registrations: null,
      persons: [],
      userId: null,
      operationals: null,
      locals: [],
      customers: [],
      operatorUnits: [],
      journeyErrorType: null
    },
    formatType: "SUMMARY-XLS",
    ruleId: null
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authData.playSessionCookie,
      'cco': authData.empresa.uid,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Export journey failed: ${response.status} - ${errorText}`);
  }

  // Export endpoint may return JSON or start async process
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return { success: true };
}

/**
 * Find a process by name and date range
 * @param {Array} processList - List of processes
 * @param {string} processName - Exact process name to match
 * @param {number} startTimestamp - Start of date range (Unix timestamp in ms)
 * @param {number} endTimestamp - End of date range (Unix timestamp in ms)
 * @returns {Object|null} Matching process or null
 */
export function findProcessByNameAndDate(processList, processName, startTimestamp, endTimestamp) {
  const matches = processList.filter(process => {
    const nameMatch = process.name === processName;
    const dateMatch = process.createDate >= startTimestamp && process.createDate <= endTimestamp;
    return nameMatch && dateMatch;
  });

  if (matches.length === 0) {
    return null;
  }

  // Sort by createDate descending and return most recent
  matches.sort((a, b) => b.createDate - a.createDate);
  return matches[0];
}
