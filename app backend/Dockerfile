# Use Node.js 20 (latest stable version)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S smartgarden -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R smartgarden:nodejs /app

# Switch to non-root user
USER smartgarden

# Expose port
EXPOSE 8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const ws = require('ws'); const client = new ws('ws://localhost:8080'); client.on('open', () => { client.close(); process.exit(0); }); client.on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "start"]
