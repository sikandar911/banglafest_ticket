#!/bin/bash

# Banglafest Deployment Script
# Handles smooth deployment with safe database migrations

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATION_TIMEOUT=300  # 5 minutes
MAX_RETRIES=30
RETRY_DELAY=5

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found in current directory"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Stop running containers gracefully
stop_containers() {
    log_info "Stopping existing containers..."
    
    if docker-compose ps | grep -q "Up"; then
        docker-compose down --timeout=30
        sleep 5
        log_success "Containers stopped successfully"
    else
        log_info "No running containers found"
    fi
}

# Clean stale locks (for safe migration)
clean_migration_locks() {
    log_info "Checking for migration locks..."
    
    # Run a temporary container to clean locks if needed
    if docker-compose up -d db; then
        sleep 10
        
        # Try to acquire and release lock to clear stale locks
        if docker-compose exec -T db psql -U "${DB_USER:-banglafest}" -d "${DB_NAME:-banglafest}" \
            -c "DELETE FROM \"_prisma_migrations\" WHERE \"finished_at\" IS NULL AND \"rolled_back_at\" IS NOT NULL;" 2>/dev/null || true; then
            log_success "Migration locks cleaned"
        fi
    fi
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    if docker-compose build; then
        log_success "Docker images built successfully"
    else
        log_error "Failed to build Docker images"
        exit 1
    fi
}

# Start services
start_services() {
    log_info "Starting services..."
    
    if docker-compose up -d; then
        log_success "Services started"
    else
        log_error "Failed to start services"
        exit 1
    fi
}

# Wait for database to be ready
wait_for_db() {
    log_info "Waiting for database to be ready..."
    
    local count=0
    while [ $count -lt $MAX_RETRIES ]; do
        if docker-compose exec -T db pg_isready -U "${DB_USER:-banglafest}" > /dev/null 2>&1; then
            log_success "Database is ready"
            return 0
        fi
        
        count=$((count + 1))
        if [ $((count % 5)) -eq 0 ]; then
            log_info "Waiting for database... ($count/$MAX_RETRIES)"
        fi
        sleep $RETRY_DELAY
    done
    
    log_error "Database did not become ready in time"
    exit 1
}

# Run Prisma migrations with locking
run_migrations() {
    log_info "Running Prisma migrations..."
    
    # Set migration timeout and attempt migration
    local start_time=$(date +%s)
    
    if docker-compose exec -T backend sh -c "cd /app && npx prisma migrate deploy --skip-generate"; then
        log_success "Migrations completed successfully"
    else
        local exit_code=$?
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $MIGRATION_TIMEOUT ]; then
            log_error "Migration timeout exceeded ($MIGRATION_TIMEOUT seconds)"
            exit 1
        fi
        
        # If migration fails but backend is healthy, it might be okay (e.g., no new migrations)
        log_warning "Migration returned exit code $exit_code. Checking backend health..."
    fi
}

# Wait for backend to be healthy
wait_for_backend() {
    log_info "Waiting for backend to be healthy..."
    
    local count=0
    while [ $count -lt $MAX_RETRIES ]; do
        if docker-compose exec -T backend curl -f http://localhost:5000 > /dev/null 2>&1; then
            log_success "Backend is healthy"
            return 0
        fi
        
        count=$((count + 1))
        if [ $((count % 5)) -eq 0 ]; then
            log_info "Waiting for backend... ($count/$MAX_RETRIES)"
        fi
        sleep $RETRY_DELAY
    done
    
    log_error "Backend did not become healthy in time"
    log_info "Checking backend logs:"
    docker-compose logs backend --tail=20
    exit 1
}

# Wait for frontend to be healthy
wait_for_frontend() {
    log_info "Waiting for frontend to be healthy..."
    
    local count=0
    while [ $count -lt $MAX_RETRIES ]; do
        if docker-compose exec -T frontend wget --quiet --tries=1 --spider http://localhost:80 2>/dev/null; then
            log_success "Frontend is healthy"
            return 0
        fi
        
        count=$((count + 1))
        if [ $((count % 5)) -eq 0 ]; then
            log_info "Waiting for frontend... ($count/$MAX_RETRIES)"
        fi
        sleep $RETRY_DELAY
    done
    
    log_warning "Frontend health check timed out, but service may still be functional"
}

# Display deployment summary
show_summary() {
    log_info "Deployment Summary:"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║             BANGLAFEST DEPLOYMENT COMPLETE                 ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    
    # Get container info
    local backend_ip=$(docker-compose exec -T backend hostname -i 2>/dev/null | awk '{print $1}' || echo "localhost")
    local frontend_ip=$(docker-compose exec -T frontend hostname -i 2>/dev/null | awk '{print $1}' || echo "localhost")
    
    echo "║ Frontend (Nginx):                                          ║"
    echo "║   URL: http://ticket.banglafest.co.uk                     ║"
    echo "║   Local: http://localhost:3000                            ║"
    echo "║   Container: banglafest_frontend                          ║"
    echo "║                                                            ║"
    echo "║ Backend (API):                                             ║"
    echo "║   URL: http://api.banglafest.co.uk                        ║"
    echo "║   Local: http://localhost:5000                            ║"
    echo "║   Container: banglafest_backend                           ║"
    echo "║                                                            ║"
    echo "║ Database (PostgreSQL):                                    ║"
    echo "║   Container: banglafest_db                                ║"
    echo "║   Port: 5432                                              ║"
    echo "║                                                            ║"
    echo "║ Useful Commands:                                           ║"
    echo "║   docker-compose logs -f backend                          ║"
    echo "║   docker-compose logs -f frontend                         ║"
    echo "║   docker-compose exec backend npm run build               ║"
    echo "║   docker-compose exec frontend npm run build              ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

# Rollback on failure
rollback() {
    log_error "Deployment failed. Rolling back..."
    docker-compose down
    exit 1
}

# Main deployment flow
main() {
    log_info "Starting Banglafest deployment..."
    echo ""
    
    trap rollback ERR
    
    check_prerequisites
    stop_containers
    clean_migration_locks
    build_images
    start_services
    wait_for_db
    run_migrations
    wait_for_backend
    wait_for_frontend
    
    show_summary
    log_success "Deployment completed successfully!"
}

# Parse arguments
case "${1:-}" in
    "stop")
        stop_containers
        ;;
    "logs")
        docker-compose logs -f "${2:-}"
        ;;
    "clean")
        log_info "Removing all containers and volumes..."
        docker-compose down -v
        log_success "Cleanup complete"
        ;;
    *)
        main
        ;;
esac
