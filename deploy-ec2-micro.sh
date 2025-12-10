#!/bin/bash

# 🚀 EC2 Micro Deployment Script
# Deploys pre-built Next.js app in under 1 minute
# Usage: ./deploy-ec2-micro.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display colored messages
log() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Main deployment function
deploy() {
    # Start timer
    START_TIME=$(date +%s)
    log "🚀 Starting EC2 Micro Deployment at $(date)"

    # 1. System Update
    log "🔄 Updating system packages..."
    if sudo apt update -qq; then
        success "System update completed"
    else
        error "System update failed"
        exit 1
    fi

    # 2. Install Node.js if not present
    log "📋 Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        warning "Node.js not found. Installing Node.js 18..."
        if curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
           sudo apt install -y -qq nodejs; then
            success "Node.js installed: $(node -v)"
        else
            error "Node.js installation failed"
            exit 1
        fi
    else
        success "Node.js found: $(node -v)"
    fi

    # 3. Clone or update repository
    log "📥 Setting up repository..."
    if [ -d "jecrc-no-dues-system" ]; then
        log "Repository exists. Updating..."
        cd jecrc-no-dues-system || exit 1
        if git pull origin main; then
            success "Repository updated"
        else
            error "Git pull failed"
            exit 1
        fi
    else
        log "Cloning repository..."
        if git clone https://github.com/your-repo/jecrc-no-dues-system.git; then
            cd jecrc-no-dues-system || exit 1
            success "Repository cloned"
        else
            error "Git clone failed"
            exit 1
        fi
    fi

    # 4. Install production dependencies
    log "📦 Installing production dependencies..."
    if npm install --production --no-audit --no-fund; then
        success "Dependencies installed"
    else
        error "Dependency installation failed"
        exit 1
    fi

    # 5. Environment setup
    log "🔧 Setting up environment variables..."
    if [ ! -f ".env.local" ]; then
        warning ".env.local not found. Creating template..."
        cat > .env.local << EOF
# JECRC No Dues System - Environment Variables
# Rename this file to .env.local and fill in the values

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_here_minimum_32_characters

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_verified_email@domain.com

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=production
EOF
        warning "Please edit .env.local with your actual credentials"
    else
        success "Environment file found"
    fi

    # 6. Start the application
    log "🚀 Starting the application..."
    if npm run start &; then
        success "Application started on port 3000"
        # Give it a moment to start
        sleep 5

        # Check if running
        if curl -s http://localhost:3000 > /dev/null; then
            success "✅ Application is running and responding!"
        else
            warning "Application started but not yet responding. This is normal during initial load."
        fi
    else
        error "Failed to start application"
        exit 1
    fi

    # Calculate and display deployment time
    END_TIME=$(date +%s)
    DEPLOY_TIME=$((END_TIME - START_TIME))
    success "✅ Deployment completed in ${DEPLOY_TIME} seconds!"

    # Display deployment info
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "📊 Deployment Time: ${DEPLOY_TIME} seconds"
    echo -e "🌐 Application URL: http://$(hostname -I | awk '{print $1}'):3000"
    echo -e "📁 Working Directory: $(pwd)"
    echo -e "💡 Node.js Version: $(node -v)"
    echo -e "📦 Next.js Version: $(npm list next | grep next | head -1 | awk '{print $2}')"
    echo -e "${BLUE}========================================${NC}"
}

# Run the deployment
deploy