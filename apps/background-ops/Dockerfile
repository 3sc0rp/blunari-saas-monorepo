FROM cgr.dev/chainguard/node:latest-dev AS builder

WORKDIR /app

# Ensure we can write lockfiles and node_modules during build
USER root

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code and production tsconfig
COPY . .

# Build the application
RUN npx tsc --project tsconfig.prod.json
# Prune dev dependencies to production only
RUN npm prune --production

# Production stage
FROM cgr.dev/chainguard/node:latest AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

# Start the application
CMD ["/usr/bin/node", "dist/server.js"]