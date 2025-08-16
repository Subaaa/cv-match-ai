# Base Node.js image
FROM node:20-slim

# Python суулгах
RUN apt-get update && apt-get install -y python3 python3-pip build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY python-openai/requirements.txt /app/python-openai/
RUN pip3 install --no-cache-dir -r /app/python-openai/requirements.txt

# Node.js dependencies
COPY backend-nodejs/package*.json /app/backend-nodejs/
RUN cd /app/backend-nodejs && npm install

COPY frontend-nextjs/package*.json /app/frontend-nextjs/
RUN cd /app/frontend-nextjs && npm install

# Copy source
COPY . .

# PM2 config
RUN npm install -g pm2
RUN echo 'module.exports = { \
  apps: [ \
    { name: "frontend-nextjs", script: "npm", args: "run start", cwd: "/app/frontend-nextjs" }, \
    { name: "backend-nodejs", script: "node", args: "server.js", cwd: "/app/backend-nodejs" }, \
    { name: "python-openai", script: "uvicorn", args: "main:app --host 0.0.0.0 --port 8000", cwd: "/app/python-openai" } \
  ] \
}' > ecosystem.config.js

EXPOSE 3000 5000 8000

CMD ["pm2-runtime", "ecosystem.config.js"]
