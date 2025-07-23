# Multi-stage build for better bcrypt handling
FROM node:20-slim AS builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma lead
RUN npx prisma generate

# Build the application
RUN npm run build

# Compile the seed script and seed data
RUN npx tsc prisma/seed.ts --outDir dist/prisma --target es2020 --module commonjs --esModuleInterop --skipLibCheck
RUN npx tsc prisma/seed-data/defaults.ts --outDir dist/prisma/seed-data --target es2020 --module commonjs --esModuleInterop --skipLibCheck

# Production stage
FROM node:20-slim AS production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema and migrations
COPY --from=builder /app/prisma ./prisma

# Copy compiled seed script and seed data
COPY --from=builder /app/dist/prisma/seed.js ./prisma/seed.js
COPY --from=builder /app/dist/prisma/seed-data ./prisma/seed-data

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Expose port
EXPOSE 8000

# Start the application with migrations
CMD ["./start.sh"] 