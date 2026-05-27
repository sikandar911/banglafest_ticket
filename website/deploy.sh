#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Deployment Script for Banglafest Website (Next.js)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="banglafest-website"
IMAGE_NAME="banglafest-website"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$SCRIPT_DIR}"
DOCKER_COMPOSE_FILE="docker-compose.yml"
LOG_FILE="/var/log/banglafest-website-deploy.log"
BACKUP_TAG=$(date +%Y%m%d_%H%M%S)

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Pre-deployment Checks
# ═══════════════════════════════════════════════════════════════════════════════

check_prerequisites() {
  log "Checking prerequisites..."

  # Check if running as root
  if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
  fi

  # Check if Docker is installed
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi

  # Check if Docker is running
  if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running"
    exit 1
  fi

  # Check if Docker Compose is installed
  if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
  fi

  log_success "All prerequisites met"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Deployment Steps
# ═══════════════════════════════════════════════════════════════════════════════

navigate_to_deployment() {
  log "Navigating to deployment directory: $DEPLOY_DIR"

  if [ ! -d "$DEPLOY_DIR" ]; then
    log_error "Deployment directory does not exist: $DEPLOY_DIR"
    exit 1
  fi

  cd "$DEPLOY_DIR"
  log_success "Successfully navigated to $DEPLOY_DIR"
}

pull_latest_code() {
  log "Pulling latest code from repository..."

  if [ ! -d ".git" ]; then
    log_warning "Not a git repository, skipping git pull"
    return
  fi

  if git pull origin main 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Latest code pulled successfully"
  else
    log_error "Failed to pull latest code"
    exit 1
  fi
}

backup_old_image() {
  log "Backing up old Docker image..."

  if docker images | grep -q "^$IMAGE_NAME"; then
    OLD_IMAGE_ID=$(docker images --filter=reference="$IMAGE_NAME:latest" --format="{{.ID}}" | head -1)
    if [ -n "$OLD_IMAGE_ID" ]; then
      docker tag "$IMAGE_NAME:latest" "$IMAGE_NAME:backup-$BACKUP_TAG"
      log_success "Old image backed up as $IMAGE_NAME:backup-$BACKUP_TAG"
    fi
  fi
}

build_docker_image() {
  log "Building Docker image..."

  if docker-compose -f "$DOCKER_COMPOSE_FILE" build 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Docker image built successfully"
  else
    log_error "Failed to build Docker image"
    exit 1
  fi
}

stop_old_container() {
  log "Stopping old container..."

  if docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    if docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
      if docker stop "$CONTAINER_NAME" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Container stopped successfully"
      else
        log_error "Failed to stop container"
        exit 1
      fi
      sleep 2
    fi

    if docker rm "$CONTAINER_NAME" 2>&1 | tee -a "$LOG_FILE"; then
      log_success "Old container removed"
    else
      log_error "Failed to remove old container"
      exit 1
    fi
  else
    log_warning "No existing container found"
  fi
}

start_new_container() {
  log "Starting new container..."

  if docker-compose -f "$DOCKER_COMPOSE_FILE" up -d 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Container started successfully"
  else
    log_error "Failed to start container"
    exit 1
  fi
}

verify_deployment() {
  log "Verifying deployment..."

  sleep 5

  # Check if container is running
  if docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    log_success "Container is running"
  else
    log_error "Container is not running"
    exit 1
  fi

  # Check if application is responding
  RETRIES=0
  MAX_RETRIES=10
  while [ $RETRIES -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3002 > /dev/null 2>&1; then
      log_success "Application is responding on port 3002"
      return 0
    fi
    RETRIES=$((RETRIES + 1))
    log_warning "Waiting for application to be ready... (attempt $RETRIES/$MAX_RETRIES)"
    sleep 3
  done

  log_error "Application failed to respond after $MAX_RETRIES attempts"
  exit 1
}

cleanup_old_images() {
  log "Cleaning up old Docker images..."

  # Remove dangling images
  docker image prune -f --filter "dangling=true" 2>&1 | tee -a "$LOG_FILE" || true

  log_success "Old images cleaned up"
}

show_deployment_info() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Deployment Information"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Container Name: $CONTAINER_NAME"
  log "Image Name: $IMAGE_NAME"
  log "Deployment Directory: $DEPLOY_DIR"
  log "Port: 3002"
  log "Domain: banglafest.co.uk"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Show container status
  log "Container Status:"
  docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

  log "Log File: $LOG_FILE"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Deployment Flow
# ═══════════════════════════════════════════════════════════════════════════════

main() {
  log "╔════════════════════════════════════════════════════════════════════════════╗"
  log "║          Banglafest Website Deployment Script                              ║"
  log "╚════════════════════════════════════════════════════════════════════════════╝"

  check_prerequisites
  navigate_to_deployment
  pull_latest_code
  backup_old_image
  build_docker_image
  stop_old_container
  start_new_container
  verify_deployment
  cleanup_old_images
  show_deployment_info

  log_success "╔════════════════════════════════════════════════════════════════════════════╗"
  log_success "║                    Deployment Completed Successfully!                      ║"
  log_success "╚════════════════════════════════════════════════════════════════════════════╝"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Error Handling
# ═══════════════════════════════════════════════════════════════════════════════

trap 'log_error "Deployment failed at line $LINENO"; exit 1' ERR

# ═══════════════════════════════════════════════════════════════════════════════
# Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

main "$@"
