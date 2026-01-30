FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Copy source files
COPY api.js server.js ./

# Copy .env.example as reference (actual .env should be mounted or set via env vars)
COPY .env.example ./

# Expose port (can be overridden by PORT env var)
EXPOSE 3000

# Set environment variable for production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the server
CMD ["bun", "run", "server.js"]
