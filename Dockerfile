# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies for Prisma and Playwright
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Install dependencies for Prisma and Playwright
RUN apt-get update && apt-get install -y \
    tini \
    openssl \
    libssl-dev \
    # Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Install Playwright browsers
RUN npx playwright install chromium

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/menu.db"

# Use tini as init process for proper signal handling
ENTRYPOINT ["tini", "--"]
# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]

EXPOSE 3000
