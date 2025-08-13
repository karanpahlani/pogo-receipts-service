# Use Node.js 24 Alpine for smaller image size
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 7646

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/scripts/healthcheck.js || exit 1

# Copy and setup entrypoint script
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Start the application with migrations
CMD ["./entrypoint.sh"]