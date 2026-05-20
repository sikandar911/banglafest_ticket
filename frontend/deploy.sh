#!/bin/bash

# Banglafest Frontend Deployment Script

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
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
    
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        docker-compose down --timeout=30
        sleep 5
        log_success "Containers stopped successfully"
    else
        log_info "No running containers found"
    fi
}

# Build Docker image
build_images() {
    log_info "Building Docker image..."
    
    if docker-compose build; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Start services
start_services() {
    log_info "Starting frontend service..."
    
    if docker-compose up -d; then
        log_success "Frontend service started"
    else
        log_error "Failed to start frontend service"
        exit 1
    fi
}

# Wait for frontend
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

# Show summary
show_summary() {
    log_info "Deployment Summary:"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         BANGLAFEST FRONTEND DEPLOYMENT COMPLETE            ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║ Frontend:                                                  ║"
    echo "║   URL: http://ticket.banglafest.co.uk                     ║"
    echo "║   Local: http://localhost:3000                            ║"
    echo "║   Container: banglafest_frontend                          ║"
    echo "║                                                            ║"
    echo "║ API Backend:                                               ║"
    echo "║   URL: ${VITE_API_URL:-http://api.banglafest.co.uk}      ║"
    echo "║                                                            ║"
    echo "║ Useful Commands:                                           ║"
    echo "║   docker-compose logs -f frontend                         ║"
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

# Main
main() {
    log_info "Starting Banglafest Frontend deployment..."
    echo ""
    
    trap rollback ERR
    
    check_prerequisites
    stop_containers
    build_images
    start_services
    wait_for_frontend
    
    show_summary
    log_success "Frontend deployment completed successfully!"
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
        log_info "Removing all containers..."
        docker-compose down -v
        log_success "Frontend cleanup complete"
        ;;
    "restart")
        log_info "Restarting frontend..."
        docker-compose restart frontend
        wait_for_frontend
        log_success "Frontend restarted"
        ;;
    *)
        main
        ;;
esac
