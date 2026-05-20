# Banglafest - Separate Deployment Infrastructure

This guide explains how to deploy Banglafest backend and frontend **independently** using separate Docker Compose configurations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐              ┌────────────────────┐ │
│  │   Frontend Stack   │              │   Backend Stack    │ │
│  ├────────────────────┤              ├────────────────────┤ │
│  │ Nginx (Port 3000)  │              │ Node API (5000)    │ │
│  └────────────────────┘              └────────────────────┘ │
│            │                                     │           │
│            │                                     │           │
│            └──────────────────┬──────────────────┘           │
│                               │                              │
│                   API Calls (HTTP/REST)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         PostgreSQL Database (Port 5432)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits of Separate Deployment

✅ **Independent Scaling** - Scale backend and frontend separately based on load
✅ **Isolated Updates** - Update frontend without restarting backend and vice versa
✅ **Different Hosting** - Frontend can be on CDN/static hosting, backend on server
✅ **Better Debugging** - Issues in one stack don't affect the other
✅ **Development Flexibility** - Each team can deploy independently

## Directory Structure

```
banglafest_ticket/
├── backend/
│   ├── Dockerfile              # Backend image definition
│   ├── docker-compose.yml      # Backend + Database
│   ├── deploy.sh               # Backend deployment script
│   ├── .env.example            # Backend configuration template
│   ├── DEPLOYMENT.md           # Backend deployment guide
│   └── ... backend code ...
│
├── frontend/
│   ├── Dockerfile              # Frontend image definition
│   ├── docker-compose.yml      # Frontend only
│   ├── deploy.sh               # Frontend deployment script
│   ├── .env.example            # Frontend configuration template
│   ├── DEPLOYMENT.md           # Frontend deployment guide
│   └── ... frontend code ...
│
└── SEPARATE_DEPLOYMENT.md      # This file
```

## Quick Start - Deploy Everything

### Step 1: Deploy Backend First

The backend must run before frontend (database must exist):

```bash
# Navigate to backend
cd backend

# Setup configuration
cp .env.example .env
nano .env  # Edit database and API credentials

# Deploy
chmod +x deploy.sh
./deploy.sh
```

Backend will:
- Start PostgreSQL database
- Run migrations
- Start Node API server on port 5000

### Step 2: Deploy Frontend

```bash
# Navigate to frontend
cd frontend

# Setup configuration
cp .env.example .env
nano .env  # Update VITE_API_URL to backend URL

# Deploy
chmod +x deploy.sh
./deploy.sh
```

Frontend will:
- Build React Vite application
- Start Nginx server on port 3000

### Step 3: Verify

```bash
# Backend should respond
curl http://localhost:5000

# Frontend should load
curl http://localhost:3000

# Test API from frontend
# Visit http://localhost:3000 in browser
# Open DevTools -> Network
# Make API calls to verify connectivity
```

## Backend Deployment

### Location
```
backend/
```

### Components
- **Database**: PostgreSQL 15
- **API**: Express.js + TypeScript
- **Port**: 5000 (configurable)

### Configuration

Create `backend/.env` from `backend/.env.example`:

```bash
# Database
DB_USER=banglafest
DB_PASSWORD=your_secure_password
DB_NAME=banglafest
DB_PORT=5432

# JWT Secrets (change these!)
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key

# Stripe Keys
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend URL
FRONTEND_URL=http://ticket.banglafest.co.uk
```

### Deployment

```bash
cd backend
chmod +x deploy.sh
./deploy.sh
```

### Management

```bash
# View logs
./deploy.sh logs

# Restart backend (keeps database)
./deploy.sh restart

# Stop everything
./deploy.sh stop

# Clean everything (delete data!)
./deploy.sh clean
```

See [backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md) for detailed information.

## Frontend Deployment

### Location
```
frontend/
```

### Components
- **Server**: Nginx
- **Framework**: React + Vite
- **Port**: 3000 (configurable)

### Configuration

Create `frontend/.env` from `frontend/.env.example`:

```bash
# Backend API URL (must be accessible from browser)
VITE_API_URL=http://api.banglafest.co.uk

# Frontend port
FRONTEND_PORT=3000
```

### Deployment

```bash
cd frontend
chmod +x deploy.sh
./deploy.sh
```

### Management

```bash
# View logs
./deploy.sh logs

# Restart frontend
./deploy.sh restart

# Stop everything
./deploy.sh stop

# Clean everything
./deploy.sh clean
```

See [frontend/DEPLOYMENT.md](./frontend/DEPLOYMENT.md) for detailed information.

## Common Deployment Scenarios

### Scenario 1: Update Backend Code Only

```bash
cd backend

# Make code changes
# ... edit code ...

# Redeploy (database and data persist)
./deploy.sh
```

Backend container restarts. Database and all data remain unchanged.

### Scenario 2: Update Frontend Code Only

```bash
cd frontend

# Make code changes
# ... edit code ...

# Redeploy
./deploy.sh
```

Frontend container rebuilds and restarts. Backend unaffected.

### Scenario 3: Full Environment Restart

```bash
# Stop both
cd backend && ./deploy.sh stop
cd frontend && ./deploy.sh stop

# Restart both
cd backend && ./deploy.sh
cd frontend && ./deploy.sh
```

### Scenario 4: Reset Backend (Delete All Data)

⚠️ **WARNING: This deletes all database data**

```bash
cd backend
./deploy.sh clean

# Redeploy fresh
./deploy.sh
```

### Scenario 5: Scale Backend While Keeping Frontend Running

```bash
# Backend redeployment doesn't affect frontend
cd backend
./deploy.sh restart

# Frontend still serves users during backend update
```

## Cross-Service Communication

### Frontend → Backend

Frontend calls backend API at `VITE_API_URL`:

```javascript
// frontend/.env
VITE_API_URL=http://api.banglafest.co.uk

// In code - gets converted to
fetch('http://api.banglafest.co.uk/api/events')
```

### Important URLs to Configure

| Service | Local | Production |
|---------|-------|-----------|
| Frontend | http://localhost:3000 | http://ticket.banglafest.co.uk |
| Backend API | http://localhost:5000 | http://api.banglafest.co.uk |
| Database | localhost:5432 | Internal only |

## Networking Modes

### Local Development (Same Machine)

**Backend**: `http://localhost:5000`
**Frontend**: `http://localhost:3000`
**Frontend → Backend**: `http://localhost:5000/api/*`

```bash
# backend/.env
BACKEND_PORT=5000

# frontend/.env
VITE_API_URL=http://localhost:5000
```

### Separate Machines

**Backend Server**: `192.168.1.10:5000`
**Frontend Server**: `192.168.1.20:3000`
**Frontend → Backend**: `http://192.168.1.10:5000/api/*`

```bash
# frontend/.env
VITE_API_URL=http://192.168.1.10:5000
```

### Production with Reverse Proxy

**Frontend**: `http://ticket.banglafest.co.uk`
**Backend**: `http://api.banglafest.co.uk`
**Frontend → Backend**: `http://api.banglafest.co.uk/api/*`

```bash
# frontend/.env
VITE_API_URL=http://api.banglafest.co.uk
```

## Port Management

### Default Ports

| Service | Port | Configurable |
|---------|------|-------------|
| Frontend | 3000 | Yes (FRONTEND_PORT) |
| Backend | 5000 | Yes (BACKEND_PORT) |
| Database | 5432 | Yes (DB_PORT) |

### Changing Ports

**Backend**:
```bash
# backend/.env
BACKEND_PORT=8000
```

**Frontend**:
```bash
# frontend/.env
FRONTEND_PORT=8080
```

**Database**:
```bash
# backend/.env
DB_PORT=5433
```

## Health Checks

### Backend Status

```bash
# Is backend running?
curl http://localhost:5000

# Docker status
cd backend && docker-compose ps
```

### Frontend Status

```bash
# Is frontend running?
curl http://localhost:3000

# Docker status
cd frontend && docker-compose ps
```

### Complete Health Check

```bash
#!/bin/bash

echo "Backend status:"
curl -s http://localhost:5000 || echo "Backend NOT running"

echo "Frontend status:"
curl -s http://localhost:3000 || echo "Frontend NOT running"

echo "Docker containers:"
docker ps --format "{{.Names}}: {{.Status}}"
```

## Troubleshooting

### Backend won't start
```bash
cd backend
./deploy.sh logs
# Check for database connection errors
```

### Frontend can't reach backend
```bash
# 1. Verify backend is running
curl http://localhost:5000

# 2. Check frontend .env VITE_API_URL
cd frontend && grep VITE_API_URL .env

# 3. Check browser console for CORS errors
# (Frontend needs backend CORS configured)
```

### Port conflicts
```bash
# Find what's using port 3000
lsof -i :3000

# Change port in .env
cd frontend
nano .env  # Change FRONTEND_PORT

# Redeploy
./deploy.sh
```

### API calls failing with 403/404
```bash
# Check backend logs
cd backend && ./deploy.sh logs backend

# Verify API endpoint exists
curl http://localhost:5000/api/events

# Check frontend is sending correct headers
# (Open DevTools -> Network -> check request headers)
```

## Backup and Disaster Recovery

### Backup Database

```bash
cd backend
./deploy.sh logs db  # Verify DB is running

# Backup
docker-compose exec db pg_dump -U banglafest banglafest > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
cd backend

# Stop backend
docker-compose down

# Restore
docker-compose up -d db
sleep 10
docker-compose exec -T db psql -U banglafest -d banglafest < backup_20240115.sql

# Start backend
./deploy.sh
```

## Performance Optimization

### Backend Optimization
- Adjust CPU/memory limits in docker-compose.yml
- Enable caching headers
- Optimize database queries
- Use connection pooling

### Frontend Optimization
- Vite build is optimized automatically
- Nginx caches static assets
- Enable gzip compression
- Use CDN for static files

## Monitoring

### Logs
```bash
# Backend logs
cd backend && ./deploy.sh logs

# Frontend logs
cd frontend && ./deploy.sh logs

# Real-time monitoring
docker stats
```

### Containers
```bash
# All containers
docker ps -a

# Container details
docker inspect banglafest_backend
docker inspect banglafest_frontend
```

## Production Deployment Checklist

### Backend
- [ ] Change all secrets in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database credentials
- [ ] Setup real Stripe/SMTP keys
- [ ] Test database backups
- [ ] Setup monitoring/alerting
- [ ] Configure logging
- [ ] Enable SSL/TLS on API

### Frontend
- [ ] Set correct `VITE_API_URL` to production backend
- [ ] Test all API endpoints work
- [ ] Enable security headers
- [ ] Setup SSL/TLS
- [ ] Configure CDN (optional)
- [ ] Test on all browsers
- [ ] Setup monitoring

### Combined
- [ ] Test complete user workflow
- [ ] Load test both services
- [ ] Plan disaster recovery
- [ ] Document deployment process
- [ ] Train team on deployment
- [ ] Create runbooks for common issues

## Support and Documentation

- **Backend**: See [backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md)
- **Frontend**: See [frontend/DEPLOYMENT.md](./frontend/DEPLOYMENT.md)
- **Original Docker Guide**: See [DOCKER.md](./DOCKER.md)

## Quick Reference

```bash
# Deploy fresh environment
cd backend && ./deploy.sh
cd frontend && ./deploy.sh

# Stop everything
cd backend && ./deploy.sh stop
cd frontend && ./deploy.sh stop

# Restart backend (keeps data)
cd backend && ./deploy.sh restart

# Restart frontend
cd frontend && ./deploy.sh restart

# View all logs
cd backend && ./deploy.sh logs
cd frontend && ./deploy.sh logs

# Clean backend (delete data!)
cd backend && ./deploy.sh clean

# Clean frontend
cd frontend && ./deploy.sh clean
```

---

**Last Updated**: 2025-01-15
**Status**: Independent deployment infrastructure ready for production
