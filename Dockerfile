# Build stage
FROM node:22-slim AS builder

ENV OPENAI_API_KEY="sk-proj-1234567890"

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    redis-server \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Configure Redis
RUN mkdir -p /var/run/redis && \
    chown redis:redis /var/run/redis && \
    chmod 777 /var/run/redis

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN service redis-server restart && \
    npm run build

RUN npx drizzle-kit push

# Production stage
FROM node:22-slim AS runner

# Add build argument for OPENAI_API_KEY
ARG OPENAI_API_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY

# Install Redis and supervisor
RUN apt-get update && apt-get install -y \
    redis-server \
    supervisor \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Configure Redis
RUN mkdir -p /var/run/redis && \
    chown redis:redis /var/run/redis

# Configure supervisor
RUN mkdir -p /var/log/supervisor

# Create supervisor config
RUN echo '[supervisord]\n\
nodaemon=true\n\
\n\
[program:redis]\n\
command=redis-server\n\
autostart=true\n\
autorestart=true\n\
stderr_logfile=/var/log/supervisor/redis.err.log\n\
stdout_logfile=/var/log/supervisor/redis.out.log\n\
\n\
[program:nextjs]\n\
command=npm start\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0' > /etc/supervisor/conf.d/supervisord.conf

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/local.db ./local.db

RUN mkdir -p local_user_data/screenshots

# Expose the Next.js port
EXPOSE 3000

# Start supervisor
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
