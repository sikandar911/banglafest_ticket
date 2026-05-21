# Multi-stage build for frontend

# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json tsconfig.node.json ./

# Install dependencies
RUN npm ci

# Copy source code and config
COPY src ./src
COPY public ./public
COPY index.html vite.config.ts postcss.config.js tailwind.config.js ./

# Build the application
RUN npm run build

# Stage 2: Runtime (Nginx)
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
  adduser -S nginx -u 1001 || true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
