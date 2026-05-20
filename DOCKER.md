# Banglafest Docker Deployment Guide

This guide explains how to deploy the Banglafest ticketing system using Docker and Docker Compose.

## Project Structure

```
banglafest_ticket/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx.conf
│   ├── src/
│   └── package.json
├── docker-compose.yml
├── deploy.sh
└── .env.example
```

## Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 1.29+)
- Bash shell (for deploy.sh)
- At least 2GB free disk space
- Ports 3000, 5000, and 5432 available (configurable)

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd banglafest_ticket

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your actual values
```

### 2. Deploy Using Script (Recommended)

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 3. Or Deploy Manually

```bash
# Build and start services
docker-compose up -d

# Verify all services are running
docker-compose ps
```

## Environment Variables

See `.env.example` for all available configuration options. Key variables:

### Database
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_NAME`: Database name

### JWT
- `JWT_ACCESS_SECRET`: Access token secret (change in production!)
- `JWT_REFRESH_SECRET`: Refresh token secret (change in production!)

### Stripe
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_PUBLISHABLE_KEY`: Stripe public key
- `STRIPE_WEBHOOK_SECRET`: Webhook secret for Stripe

### Email
- `SMTP_HOST`: Email service host
- `SMTP_USER`: Email service username
- `SMTP_PASS`: Email service password
- `EMAIL_FROM`: Sender email address

### URLs
- `FRONTEND_URL`: Frontend URL for email links
- `VITE_API_URL`: API URL for frontend

## Common Commands

### Deployment

```bash
# Deploy everything (fresh start)
./deploy.sh

# Stop services
./deploy.sh stop

# View logs
./deploy.sh logs backend
./deploy.sh logs frontend
./deploy.sh logs

# Clean up (remove all containers and volumes)
./deploy.sh clean
```

### Direct Docker Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Execute command in container
docker-compose exec backend npm run build
docker-compose exec frontend npm run build

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Database Operations

```bash
# Connect to database
docker-compose exec db psql -U banglafest -d banglafest

# Backup database
docker-compose exec db pg_dump -U banglafest banglafest > backup.sql

# Restore database
docker-compose exec -T db psql -U banglafest -d banglafest < backup.sql
```

## Services

### Backend (api.banglafest.co.uk)
- **Container**: banglafest_backend
- **Port**: 5000
- **Framework**: Express.js + TypeScript
- **Database**: Connected to PostgreSQL

### Frontend (ticket.banglafest.co.uk)
- **Container**: banglafest_frontend
- **Port**: 3000 (external), 80 (internal)
- **Server**: Nginx
- **Framework**: React + Vite + TypeScript

### Database (PostgreSQL)
- **Container**: banglafest_db
- **Port**: 5432
- **Version**: PostgreSQL 15
- **Data Volume**: `postgres_data`

## Networking

All services communicate through `banglafest_network` bridge network:
- Frontend → Backend: `http://backend:5000`
- Backend → Database: `postgresql://db:5432`

## Health Checks

Each service includes health checks:

```bash
# Check service health
docker-compose ps
```

Healthy services show `(healthy)` status.

## Troubleshooting

### Services not starting

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Full cleanup and restart
docker-compose down -v
./deploy.sh
```

### Database connection issues

```bash
# Verify database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Test connection
docker-compose exec db pg_isready -U banglafest
```

### Migration failures

The `deploy.sh` script handles migrations safely:
- Cleans stale locks before migration
- Times out after 5 minutes
- Provides detailed error messages

Manual migration:
```bash
docker-compose exec backend npx prisma migrate deploy
```

### Port conflicts

Edit `docker-compose.yml` to change ports:
```yaml
backend:
  ports:
    - "5001:5000"  # Changed from 5000:5000
```

## Production Deployment Checklist

- [ ] Update all secrets in `.env` file
- [ ] Set `NODE_ENV=production`
- [ ] Configure Stripe keys
- [ ] Configure SMTP credentials
- [ ] Update domain URLs (remove `http://`)
- [ ] Set up SSL/TLS (use reverse proxy like Nginx or Caddy)
- [ ] Configure database backup strategy
- [ ] Set up monitoring and alerts
- [ ] Test rollback procedures
- [ ] Document all customizations

## Security Considerations

1. **Secrets Management**
   - Never commit `.env` to git
   - Use secrets manager in production (AWS Secrets Manager, Vault, etc.)
   - Rotate JWT secrets regularly

2. **Network Security**
   - Use TLS/SSL for all traffic
   - Set strong database passwords
   - Restrict database access
   - Use security headers (configured in nginx.conf)

3. **Image Security**
   - Use specific image versions (not `latest`)
   - Scan images for vulnerabilities
   - Use non-root users (implemented)

4. **Container Security**
   - Enable read-only root filesystem where possible
   - Use resource limits
   - Enable security options

## Scaling

### Horizontal Scaling

Multiple backend instances:
```yaml
backend:
  deploy:
    replicas: 3
```

### Vertical Scaling

Increase resources:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Monitoring and Logging

### View logs with timestamps
```bash
docker-compose logs --timestamps backend
```

### Follow logs in real-time
```bash
docker-compose logs -f
```

### Export logs
```bash
docker-compose logs > deployment.log
```

## Backup and Recovery

### Backup database
```bash
docker-compose exec db pg_dump -U banglafest banglafest > banglafest_$(date +%Y%m%d_%H%M%S).sql
```

### Backup volumes
```bash
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## Updates and Maintenance

### Update dependencies
```bash
# Backend
docker-compose exec backend npm update

# Frontend
docker-compose exec frontend npm update
```

### Rebuild images
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review this guide
3. Check Docker/Docker Compose documentation
4. Consult your DevOps team

## License

See LICENSE file in repository root.
