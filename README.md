# MaxTrack Export API

A lightweight REST API microservice that integrates with MaxTrack to retrieve yesterday's journey export data for PowerBI consumption.

## Features

- 🚀 Built with **Bun** native server (zero dependencies)
- 🔒 Accepts credentials via API request (no stored credentials)
- 📊 Streams yesterday's journey export file directly (binary)
- ⚡ Automatic process polling and export triggering
- 🐳 Docker-ready for easy deployment
- 💾 Minimal footprint (~70MB Docker image)
- 🔗 Fixed URL for PowerBI Cloud (no dynamic data source issues)

## Architecture

The API follows this workflow:

1. Accepts MaxTrack credentials via request headers
2. Authenticates with MaxTrack API
3. Checks for existing "Planilha de Jornadas V2" export from yesterday
4. If found and completed, downloads the file from S3
5. If not found, triggers a new export for yesterday's data
6. Polls the process status until completion (max 10 minutes)
7. Streams the Excel file binary directly to the client

## API Endpoints

### `GET /api/journey-export`

Main endpoint to retrieve yesterday's journey export.

**Request Headers:**
- `email`: Your MaxTrack email address
- `password`: Your MaxTrack password

**Success Response (200):**

The response body is the **raw Excel file binary** (streamed directly from S3).

| Header | Example Value |
|--------|---------------|
| `Content-Type` | `application/vnd.ms-excel` |
| `Content-Disposition` | `attachment; filename="export.xls"` |

**Error Response (400/401/500):**
```json
{
  "success": false,
  "error": "Authentication failed: Invalid credentials"
}
```

### `GET /health`

Health check endpoint for monitoring.

**Response (200):**
```json
{
  "status": "ok"
}
```

## Installation & Usage

### Prerequisites

- [Bun](https://bun.sh) runtime installed (v1.0 or higher)
- OR Docker for containerized deployment

### Local Development

1. **Clone and setup:**
   ```bash
   cd /path/to/maxtrack-export-sheet
   ```

2. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   # Edit .env to change PORT if needed (default: 3000)
   ```

3. **Run the server:**
   ```bash
   bun run server.js
   ```

4. **Test the endpoint:**
   ```bash
   curl -o export.xls http://localhost:3000/api/journey-export \
     -H "email: your-email@example.com" \
     -H "password: your-password"
   ```

### Docker Deployment

#### Build and run with Docker:

```bash
# Build image
docker build -t maxtrack-export-api .

# Run container
docker run -d \
  --name maxtrack-api \
  -p 3000:3000 \
  -e PORT=3000 \
  maxtrack-export-api
```

#### Or use Docker Compose:

```bash
docker-compose up -d
```

The API will be available at `http://localhost:3000`

### Production Deployment

For production servers:

1. **Build the Docker image:**
   ```bash
   docker build -t maxtrack-export-api:latest .
   ```

2. **Run with appropriate port mapping:**
   ```bash
   docker run -d \
     --name maxtrack-api \
     --restart unless-stopped \
     -p 3000:3000 \
     maxtrack-export-api:latest
   ```

3. **Configure reverse proxy (optional):**
   Use nginx or similar to add HTTPS and domain mapping.

## PowerBI Integration

The API streams the Excel file directly, so PowerBI sees a **fixed, static URL** — no dynamic S3 URLs that would be blocked by PowerBI Cloud.

To consume this API in PowerBI:

1. Use **Web Connector** as data source
2. Set URL to: `http://your-server:3000/api/journey-export`
3. Use **GET** method
4. Add headers:
   - `email`: your MaxTrack email
   - `password`: your MaxTrack password
5. PowerBI will receive the Excel file directly and can parse it as a table

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

### Timeouts & Limits

| Setting | Value | Location |
|---------|-------|----------|
| Poll Interval | 5 seconds | `server.js:6` |
| Max Poll Time | 10 minutes | `server.js:7` |
| Process Page Size | 100 | `api.js:59` |

## Project Structure

```
.
├── api.js              # MaxTrack API client functions
├── server.js           # Bun HTTP server and route logic
├── Dockerfile          # Container image definition
├── docker-compose.yml  # Docker Compose configuration
├── .env                # Environment variables (local)
├── .env.example        # Environment template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Error Handling

The API handles various error scenarios:

- **400 Bad Request:** Missing email/password headers
- **401 Unauthorized:** Invalid MaxTrack credentials
- **404 Not Found:** Invalid endpoint
- **500 Internal Server Error:** API failures, timeouts, or process errors

## Development Notes

- No external dependencies required (uses Bun's built-in fetch)
- Processes are filtered by exact name: "Planilha de Jornadas V2"
- Date filtering uses yesterday (00:00:00 to 23:59:59 in local timezone)
- Most recent process is returned if multiple matches exist
- Export format is hardcoded to `SUMMARY-XLS`
- The API downloads the file from S3 and streams it to the client, so the URL never changes from PowerBI's perspective

## Troubleshooting

**Server won't start:**
- Check if port 3000 is already in use: `lsof -i :3000`
- Try a different port: `PORT=3001 bun run server.js`

**Authentication fails:**
- Verify credentials are correct
- Check MaxTrack API is accessible from your network

**Timeout errors:**
- Export may take longer than 5 minutes for large datasets
- Increase `MAX_POLL_TIME_MS` in [server.js](server.js#L7)

**Process not found:**
- Verify the exact process name in MaxTrack matches "Planilha de Jornadas V2"
- Check date filtering logic for timezone issues

## License

Private project - All rights reserved.
