#!/bin/bash

# 🚀 JECRC No Dues System - AWS Deployment Script
# This script automates the deployment process to AWS Amplify

set -e  # Exit on any error

echo "======================================"
echo "🚀 JECRC No Dues - AWS Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi
print_success "npm $(npm -v) detected"

# Check git
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi
print_success "Git $(git --version | cut -d' ' -f3) detected"

echo ""

# Step 2: Verify environment variables
echo "🔐 Step 2: Verifying environment variables..."
echo ""

if [ ! -f .env.local ]; then
    print_error ".env.local file not found!"
    print_info "Please create .env.local with your Supabase and other credentials"
    exit 1
fi

# Check for required env variables
REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "JWT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" .env.local; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_success "All required environment variables found"
echo ""

# Step 3: Install dependencies
echo "📦 Step 3: Installing dependencies..."
echo ""

npm ci
print_success "Dependencies installed"
echo ""

# Step 4: Run tests (if they exist)
echo "🧪 Step 4: Running tests..."
echo ""

if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    npm test || {
        print_warning "Tests failed or not configured. Continuing anyway..."
    }
else
    print_info "No tests configured, skipping..."
fi
echo ""

# Step 5: Build the application
echo "🏗️  Step 5: Building application..."
echo ""

npm run build || {
    print_error "Build failed! Please fix errors before deploying."
    exit 1
}

print_success "Build successful"
echo ""

# Step 6: Git status check
echo "📝 Step 6: Checking Git status..."
echo ""

if [ ! -d .git ]; then
    print_warning "Not a git repository. Initializing..."
    git init
    print_success "Git initialized"
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    print_warning "You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        print_success "Changes committed"
    else
        print_info "Continuing without committing changes..."
    fi
fi

echo ""

# Step 7: Check remote repository
echo "🌐 Step 7: Checking remote repository..."
echo ""

if ! git remote | grep -q 'origin'; then
    print_warning "No remote repository configured."
    print_info "Please follow these steps:"
    echo ""
    echo "1. Create a new repository on GitHub: https://github.com/new"
    echo "2. Run these commands:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/jecrc-no-dues.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    print_info "After pushing to GitHub, connect it to AWS Amplify:"
    echo "1. Go to: https://console.aws.amazon.com/amplify"
    echo "2. Click 'New app' → 'Host web app'"
    echo "3. Choose GitHub and select your repository"
    echo "4. Add environment variables (see AWS_DEPLOYMENT_NOW.md)"
    echo "5. Deploy!"
    exit 0
fi

REMOTE_URL=$(git remote get-url origin)
print_success "Remote repository: $REMOTE_URL"

echo ""

# Step 8: Push to repository
echo "⬆️  Step 8: Pushing to repository..."
echo ""

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "Current branch: $CURRENT_BRANCH"

read -p "Push to remote? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin $CURRENT_BRANCH || {
        print_error "Push failed. Please check your git configuration."
        exit 1
    }
    print_success "Pushed to remote repository"
else
    print_info "Skipping push. Remember to push manually!"
fi

echo ""
echo "======================================"
echo "✅ Pre-deployment checks complete!"
echo "======================================"
echo ""
print_success "Your code is ready for AWS deployment!"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Go to AWS Amplify Console:"
echo "   https://console.aws.amazon.com/amplify"
echo ""
echo "2. If this is your first deployment:"
echo "   • Click 'New app' → 'Host web app'"
echo "   • Connect to GitHub"
echo "   • Select your repository"
echo "   • Add environment variables from .env.local"
echo "   • Deploy!"
echo ""
echo "3. If already connected to Amplify:"
echo "   • Amplify will auto-deploy your latest push"
echo "   • Check build progress in Amplify console"
echo ""
echo "4. For detailed instructions, see:"
echo "   • AWS_DEPLOYMENT_NOW.md"
echo "   • PRODUCTION_DEPLOYMENT_GUIDE.md"
echo ""
print_success "Deployment preparation complete! 🎉"