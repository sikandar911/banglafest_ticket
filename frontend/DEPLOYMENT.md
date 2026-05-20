# Banglafest Frontend Deployment

This guide explains how to deploy the Banglafest frontend using Docker and Docker Compose.

## Quick Start

### 1. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your API backend URL
nano .env
```

### 2. Deploy

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
- ✅ Check Docker prerequisites
- ✅ Stop existing containers
- ✅ Build Docker image
- ✅ Start frontend service
- ✅ Wait for frontend to be healthy

## Service

### Frontend (Nginx)
- **Container**: banglafest_frontend
- **Port**: 3000 (configurable via `FRONTEND_PORT`)
- **Server**: Nginx Alpine
- **Framework**: React + Vite + TypeScript
- **Health Check**: HTTP endpoint at `http://localhost:80`

## Configuration

Configuration is done via environment variables in `.env`:

### API Backend Connection
```
VITE_API_URL=http://api.banglafest.co.uk
```

This is where the frontend will send API requests. Update to match your backend URL:
- **Local development**: `http://localhost:5000`
- **Same network**: `http://backend:5000` (if using Docker network)
- **Production**: `http://api.banglafest.co.uk`

### Port Configuration
```
FRONTEND_PORT=3000
```

## Deployment Commands

### Deploy Fresh
```bash
./deploy.sh
```

### View Logs
```bash
# All logs
./deploy.sh logs

# Frontend only
./deploy.sh logs frontend
```

### Stop Services
```bash
./deploy.sh stop
```

### Restart Frontend
```bash
./deploy.sh restart
```

### Clean Everything
```bash
./deploy.sh clean
```

## Direct Docker Commands

### Basic Commands
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Execute Commands
```bash
# Rebuild frontend assets
docker-compose exec frontend npm run build

# Get shell access
docker-compose exec frontend sh

# Test health
docker-compose exec frontend wget --spider http://localhost:80
```

### Access Nginx
```bash
# Get Nginx configuration
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Test Nginx configuration
docker-compose exec frontend nginx -t

# Reload Nginx
docker-compose exec frontend nginx -s reload
```

## Accessing the Application

### Local Access
```
http://localhost:3000
```

### Production Domain
```
http://ticket.banglafest.co.uk
```

(Requires DNS configuration and reverse proxy setup)

## Troubleshooting

### Frontend won't start
```bash
# Check logs
./deploy.sh logs

# Clean and restart
./deploy.sh clean
./deploy.sh
```

### Port already in use
```bash
# Check what's using port 3000
lsof -i :3000

# Use different port
# Edit .env and change FRONTEND_PORT=3001
./deploy.sh
```

### Cannot connect to backend API
1. **Check backend is running**
   ```bash
   curl http://localhost:5000
   ```

2. **Verify VITE_API_URL in .env**
   ```bash
   cat .env | grep VITE_API_URL
   ```

3. **Check network connectivity**
   - Ensure backend URL is accessible from frontend
   - Check CORS settings on backend
   - Verify firewall rules

4. **Check browser console**
   - Open DevTools (F12)
   - Look for failed API requests
   - Check CORS errors

### Health check timeout
```bash
# Check frontend logs
docker-compose logs frontend

# Manually test
docker-compose exec frontend wget --spider http://localhost:80
```

### Nginx errors
```bash
# Check Nginx logs
docker-compose logs frontend

# Test Nginx config
docker-compose exec frontend nginx -t

# Get debug logs (if enabled)
docker-compose exec frontend cat /var/log/nginx/error.log
```

## Production Checklist

- [ ] Update `VITE_API_URL` to production backend
- [ ] Set `FRONTEND_PORT` if needed (usually keep 3000)
- [ ] Build production assets (`npm run build` is automatic)
- [ ] Configure SSL/TLS (use reverse proxy like Nginx or Caddy)
- [ ] Set up security headers in nginx.conf
- [ ] Configure CORS properly on backend
- [ ] Test all API endpoints work
- [ ] Monitor frontend performance
- [ ] Set up CDN for static assets (optional)

## Ports

Default port:
- Frontend: 3000 (set via `FRONTEND_PORT`)

To change port, update `.env`:
```bash
FRONTEND_PORT=3001
```

Then restart: `./deploy.sh`

## Health Checks

Frontend includes automatic health checks:

```bash
# Check status
docker-compose ps
```

Shows health status like: `(healthy)` or `(starting)`

## Logs

Frontend logs are available at:
```bash
# Real-time
docker-compose logs -f frontend

# Last 20 lines
docker-compose logs --tail 20 frontend

# With timestamps
docker-compose logs --timestamps frontend

# Nginx access logs
docker-compose logs --tail 20 frontend | grep "GET\|POST"
```

## Performance Optimization

The Nginx configuration includes:

### Caching
- Static assets (JS, CSS, images) cached for 1 year
- `Cache-Control: public, immutable` headers

### Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: no-referrer-when-downgrade

### Compression
- Gzip compression for responses
- Configured in Nginx

### SPA Routing
- All unknown routes redirect to `index.html`
- Allows React Router to handle routing

## API Integration

The frontend communicates with backend at:
```
VITE_API_URL/api/*
```

Example API calls:
```javascript
// Gets proxied to: http://api.banglafest.co.uk/api/events
fetch(`${VITE_API_URL}/api/events`)
```

## Reverse Proxy Setup

For production, setup a reverse proxy (Nginx, Caddy, or similar):

### Simple Nginx Example
```nginx
server {
    listen 80;
    server_name ticket.banglafest.co.uk;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## SSL/TLS Setup

Use Let's Encrypt with Certbot:
```bash
certbot certonly --standalone -d ticket.banglafest.co.uk
```

Then configure reverse proxy to use certificates.

## Monitoring

### Check Container Health
```bash
docker-compose ps
```

### Monitor Resource Usage
```bash
docker stats
```

### View Nginx Statistics
```bash
# Active connections
docker-compose exec frontend curl http://localhost:80/nginx_status 2>/dev/null || echo "Status module not enabled"
```

## Deployment Workflow

### Typical deployment process:
1. Update code in frontend folder
2. Update `.env` if needed
3. Run `./deploy.sh`
4. Verify at `http://localhost:3000`
5. Test API connectivity
6. Deploy to production

### Zero-downtime update:
1. Build new image: `docker-compose build`
2. Start new container: `docker-compose up -d`
3. Old container automatically replaced

## Support

For issues:
1. Check logs: `./deploy.sh logs`
2. Review this guide
3. Check browser DevTools for API errors
4. Check Docker/Compose documentation
5. Contact your DevOps team
