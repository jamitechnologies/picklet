# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDeps for build)
RUN npm ci

# Copy source
COPY src ./src

# Build
RUN npm run build

# Runtime Stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files for production install
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Create a non-root user
RUN addgroup -S picket && adduser -S picket -G picket
USER picket

# Expose port
EXPOSE 3000

# Start command (can be overridden to run worker)
CMD ["npm", "start"]
