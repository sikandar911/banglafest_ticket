# Banglafest Backend Deployment

This guide explains how to deploy the Banglafest backend using Docker and Docker Compose.

## Quick Start

### 1. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your actual values
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
- ✅ Clean stale Prisma migration locks
- ✅ Build Docker image
- ✅ Start services (database + backend)
- ✅ Wait for database to be ready
- ✅ Run Prisma migrations
- ✅ Wait for backend to be healthy

## Services

### PostgreSQL Database
- **Container**: banglafest_db
- **Port**: 5432 (configurable via `DB_PORT`)
- **Data**: Persistent volume at `postgres_data`

### Backend API
- **Container**: banglafest_backend
- **Port**: 5000 (configurable via `BACKEND_PORT`)
- **Framework**: Express.js + TypeScript
- **Health Check**: HTTP endpoint at `http://localhost:5000`

## Configuration

All configuration is done via environment variables in `.env`:

### Database
```
DB_USER=banglafest
DB_PASSWORD=changeme_in_production
DB_NAME=banglafest
DB_PORT=5432
```

### Security (JWT)
```
JWT_ACCESS_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

### Payment (Stripe)
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Email (SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@banglafest.co.uk
```

### URLs
```
FRONTEND_URL=http://ticket.banglafest.co.uk
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

# Backend only
./deploy.sh logs backend

# Database only
./deploy.sh logs db
```

### Stop Services
```bash
./deploy.sh stop
```

### Restart Backend
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
docker-compose logs -f backend

# View database logs
docker-compose logs -f db

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Execute Commands
```bash
# Run command in backend
docker-compose exec backend npm run build

# Connect to database
docker-compose exec db psql -U banglafest -d banglafest

# Get backend shell
docker-compose exec backend sh
```

### Database Operations
```bash
# Backup database
docker-compose exec db pg_dump -U banglafest banglafest > backup.sql

# Restore database
docker-compose exec -T db psql -U banglafest -d banglafest < backup.sql
```

## Troubleshooting

### Services won't start
```bash
# Check logs
./deploy.sh logs

# Clean and restart
./deploy.sh clean
./deploy.sh
```

### Database connection error
```bash
# Check database is running
docker-compose ps db

# Check database logs
./deploy.sh logs db

# Test connection
docker-compose exec db pg_isready -U banglafest
```

### Migration failures
```bash
# Check logs
docker-compose logs backend

# Manual migration
docker-compose exec backend npx prisma migrate deploy

# Force migration reset (caution!)
docker-compose exec backend npx prisma migrate reset
```

### Backend won't become healthy
```bash
# Check logs
docker-compose logs backend

# Check if port is available
lsof -i :5000

# Test health endpoint
curl http://localhost:5000
```

## Production Checklist

- [ ] Change all secrets in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure Stripe production keys
- [ ] Configure real SMTP credentials
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Set strong database password
- [ ] Configure SSL/TLS (use reverse proxy)
- [ ] Set up automated backups
- [ ] Monitor logs and errors
- [ ] Test database restore procedure

## Ports

Default ports (configurable in `.env`):
- Backend: 5000 (set via `BACKEND_PORT`)
- Database: 5432 (set via `DB_PORT`)

To change ports, update `.env`:
```bash
BACKEND_PORT=5001
DB_PORT=5433
```

Then restart: `./deploy.sh`

## Health Checks

Each service includes automatic health checks:

```bash
# Check status
docker-compose ps
```

Shows health status like: `(healthy)` or `(starting)`

## Logs

Backend logs are available at:
```bash
# Real-time
docker-compose logs -f backend

# Last 20 lines
docker-compose logs --tail 20 backend

# With timestamps
docker-compose logs --timestamps backend
```

## Backup and Recovery

### Backup
```bash
# Full backup
docker-compose exec db pg_dump -U banglafest -F c banglafest > backup.dump

# Text backup
docker-compose exec db pg_dump -U banglafest banglafest > backup.sql
```

### Restore
```bash
# From custom format
docker-compose exec -T db pg_restore -U banglafest -d banglafest < backup.dump

# From SQL
docker-compose exec -T db psql -U banglafest -d banglafest < backup.sql
```

## Performance Tips

1. **Database Performance**
   - Monitor query logs
   - Add indexes on frequently queried columns
   - Regular VACUUM and ANALYZE

2. **Backend Performance**
   - Use connection pooling
   - Cache responses
   - Monitor memory usage

3. **Resource Limits**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
       reservations:
         cpus: '0.5'
         memory: 256M
   ```

## Monitoring

### Health Endpoint
```bash
curl http://localhost:5000
```

### Database Connections
```bash
docker-compose exec db psql -U banglafest -d banglafest -c "SELECT count(*) FROM pg_stat_activity;"
```

### Disk Usage
```bash
docker volume ls
docker system df
```

## Support

For issues:
1. Check logs: `./deploy.sh logs`
2. Review this guide
3. Check Docker/Compose documentation
4. Contact your DevOps team
