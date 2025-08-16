# -------------------
# 1. Base image (Python + Node)
# -------------------
FROM python:3.11-slim

# Node.js install
RUN apt-get update && apt-get install -y curl build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pm2

WORKDIR /app

# -------------------
# 2. Python dependencies
# -------------------
COPY python-openai/requirements.txt /app/python-openai/requirements.txt
RUN pip install --no-cache-dir -r /app/python-openai/requirements.txt

# -------------------
# 3. Node.js + Next.js dependencies
# -------------------
COPY backend-nodejs/package*.json /app/backend-nodejs/
RUN cd /app/backend-nodejs && npm install

COPY frontend-nextjs/package*.json /app/frontend-nextjs/
RUN cd /app/frontend-nextjs && npm install

# -------------------
# 4. Copy source code
# -------------------
COPY . .

# -------------------
# 5. PM2 config (3 services)
# -------------------
RUN echo 'module.exports = { \
  apps: [ \
    { name: "frontend-nextjs", script: "npm", args: "run start", cwd: "/app/frontend-nextjs" }, \
    { name: "backend-nodejs", script: "node", args: "server.js", cwd: "/app/backend-nodejs" }, \
    { name: "python-openai", script: "uvicorn", args: "main:app --host 0.0.0.0 --port 8000", cwd: "/app/python-openai" } \
  ] \
}' > ecosystem.config.js

EXPOSE 3000 5000 8000

CMD ["pm2-runtime", "ecosystem.config.js"]
