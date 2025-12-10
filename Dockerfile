# 🐳 Dockerfile for JECRC No Dues System - Pre-Built Deployment
# Ultra-fast deployment for EC2 Micro instances

# Use lightweight Node.js Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install minimal dependencies
RUN apk add --no-cache bash

# Copy package files first for better caching
COPY package*.json ./

# Copy pre-built Next.js assets
COPY .next ./.next
COPY public ./public

# Install only production dependencies (faster and smaller)
RUN npm install --production --no-audit --no-fund

# Copy environment configuration
COPY .env.local .env.local

# Copy deployment script
COPY deploy-ec2-micro.sh /usr/local/bin/deploy-ec2-micro
RUN chmod +x /usr/local/bin/deploy-ec2-micro

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["npm", "run", "start"]