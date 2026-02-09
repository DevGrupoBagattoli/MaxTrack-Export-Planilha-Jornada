# Quick Start Guide

## 🚀 Run Locally with Bun

```bash
# Start the server
bun run server.js

# In another terminal, test it
curl http://localhost:3000/health

# Or use the test script
./test.sh
```

## 🐳 Run with Docker

```bash
# Build the image
docker build -t maxtrack-export-api .

# Run the container
docker run -d -p 3000:3000 --name maxtrack-api maxtrack-export-api

# Check logs
docker logs maxtrack-api

# Test it
curl http://localhost:3000/health

# Stop and remove
docker stop maxtrack-api && docker rm maxtrack-api
```

## 🔧 Run with Docker Compose

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📊 Test the API

```bash
# Health check
curl http://localhost:3000/health

# Download yesterday's journey export (saves as .xls file)
curl -o export.xls http://localhost:3000/api/journey-export \
  -H "email: your-email@example.com" \
  -H "password: your-password"
```

## 📝 Example Response

Success: The API returns the **raw Excel file binary** directly. Use `curl -o export.xls` to save it.

Error (JSON):
```json
{
  "success": false,
  "error": "Authentication failed: Invalid credentials"
}
```

## 🔍 Troubleshooting

**Server won't start:**
```bash
# Check if port is in use
lsof -i :3000

# Use different port
PORT=3001 bun run server.js
```

**Docker build fails:**
```bash
# Check Bun is available in image
docker run --rm oven/bun:1-alpine bun --version
```

**API returns timeout:**
- Increase `MAX_POLL_TIME_MS` in server.js (currently 10 minutes)
- Check network connectivity to MaxTrack API
```

See [README.md](README.md) for full documentation.
