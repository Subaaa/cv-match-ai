# -------------------
# Stage 1: Build all Node apps + install PM2
# -------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install PM2 globally in builder
RUN npm install -g pm2

# Frontend dependencies
COPY frontend-nextjs/package*.json ./frontend-nextjs/
RUN cd frontend-nextjs && npm ci

# Backend dependencies (production only)
COPY backend-nodejs/package*.json ./backend-nodejs/
RUN cd backend-nodejs && npm ci --production

# Copy source code
COPY frontend-nextjs/ ./frontend-nextjs/
COPY backend-nodejs/ ./backend-nodejs/

# Build frontend
RUN cd frontend-nextjs && npm run build

# -------------------
# Stage 2: Final minimal image (Python + Node runtime from builder)
# -------------------
FROM python:3.11-slim
WORKDIR /app

# Install minimal curl for PM2 startup
RUN apt-get update && apt-get install -y curl --no-install-recommends \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy Node runtime + npm + PM2 from builder
COPY --from=builder /usr/local/bin/node /usr/local/bin/
COPY --from=builder /usr/local/bin/npm /usr/local/bin/
COPY --from=builder /usr/local/bin/pm2 /usr/local/bin/
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

# Copy built frontend + backend + production node_modules
COPY --from=builder /app/frontend-nextjs/.next ./frontend-nextjs/.next
COPY --from=builder /app/frontend-nextjs/public ./frontend-nextjs/public
COPY --from=builder /app/frontend-nextjs/node_modules ./frontend-nextjs/node_modules
COPY --from=builder /app/backend-nodejs ./backend-nodejs

# Copy Python source + requirements
COPY python-openai/ ./python-openai/
COPY python-openai/requirements.txt ./python-openai/
RUN pip install --no-cache-dir -r python-openai/requirements.txt

# PM2 ecosystem
RUN echo 'module.exports = { \
  apps: [ \
    { name: "frontend-nextjs", script: "npx", args: "next start", cwd: "/app/frontend-nextjs" }, \
    { name: "backend-nodejs", script: "npm", args: "run start", cwd: "/app/backend-nodejs" }, \
    { name: "python-openai", script: "main.py", cwd: "/app/python-openai", interpreter: "python3" } \
  ] \
}' > ecosystem.config.js

EXPOSE 3000 5000 8000
CMD ["pm2-runtime", "ecosystem.config.js"]
