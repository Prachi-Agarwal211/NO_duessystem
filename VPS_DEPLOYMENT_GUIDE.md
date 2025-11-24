# VPS Deployment Guide - JECRC No Dues System

Complete guide for deploying your Next.js application on a VPS (Virtual Private Server) with custom port configuration.

## 🖥️ Server Requirements

- **OS:** Ubuntu 20.04 LTS or higher (recommended) / Debian 11+ / CentOS 8+
- **RAM:** Minimum 2GB (4GB recommended)
- **Storage:** Minimum 20GB
- **CPU:** 2+ cores recommended
- **Node.js:** v18.x or higher
- **PM2:** For process management
- **Nginx:** For reverse proxy

## 📋 Pre-Deployment Checklist

All deployment fixes have been applied:
- ✅ Environment validation fixed
- ✅ Dynamic exports added to all API routes
- ✅ Suspense boundaries added to pages
- ✅ Production-ready build configuration

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your VPS

```bash
ssh username@your-vps-ip
# Example: ssh root@203.0.113.45
```

### Step 2: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Node.js 18.x

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version
```

### Step 4: Install PM2 Process Manager

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Step 5: Install Nginx

```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 6: Clone Your Repository

```bash
# Navigate to web root
cd /var/www/

# Clone repository
sudo git clone https://github.com/Prachi-Agarwal211/NO_duessystem.git jecrc-no-dues

# Set ownership
sudo chown -R $USER:$USER /var/www/jecrc-no-dues

# Navigate to project
cd jecrc-no-dues
```

### Step 7: Configure Environment Variables

```bash
# Create .env.local file
nano .env.local
```

Add your environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (32+ characters)
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters-long

# Resend Email Service
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM=noreply@yourdomain.com

# Node Environment
NODE_ENV=production

# Custom Port Configuration
PORT=3001

# Base URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Department Emails
SCHOOL_HOD_EMAIL=hod.school@jecrc.ac.in
LIBRARY_EMAIL=library@jecrc.ac.in
IT_DEPARTMENT_EMAIL=it@jecrc.ac.in
HOSTEL_EMAIL=hostel@jecrc.ac.in
MESS_EMAIL=mess@jecrc.ac.in
CANTEEN_EMAIL=canteen@jecrc.ac.in
TPO_EMAIL=tpo@jecrc.ac.in
ALUMNI_EMAIL=alumni@jecrc.ac.in
ACCOUNTS_EMAIL=accounts@jecrc.ac.in
REGISTRAR_EMAIL=registrar@jecrc.ac.in
EXAM_CELL_EMAIL=exam@jecrc.ac.in
SPORTS_EMAIL=sports@jecrc.ac.in
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 8: Install Dependencies and Build

```bash
# Install dependencies
npm install --legacy-peer-deps

# Build for production
npm run build

# Test the build
npm start
```

Press `Ctrl+C` to stop the test server.

## 🔧 Custom Port Configuration

### Option 1: Using PORT Environment Variable

Next.js automatically reads the `PORT` environment variable:

```bash
# In .env.local
PORT=3001
```

### Option 2: Using package.json

Edit `package.json`:

```json
{
  "scripts": {
    "start": "next start -p 3001",
    "dev": "next dev -p 3001"
  }
}
```

### Option 3: Multiple Applications on Different Ports

If you have multiple apps:

```bash
# App 1 on port 3000
PORT=3000 pm2 start npm --name "app1" -- start

# App 2 on port 3001
PORT=3001 pm2 start npm --name "jecrc-no-dues" -- start

# App 3 on port 3002
PORT=3002 pm2 start npm --name "app3" -- start
```

## 📦 PM2 Process Management

### Start Application

```bash
# Method 1: Using ecosystem file (recommended)
pm2 start ecosystem.config.js

# Method 2: Direct start with custom port
PORT=3001 pm2 start npm --name "jecrc-no-dues" -- start

# Method 3: Using next command directly
pm2 start npm --name "jecrc-no-dues" -- start -- -p 3001
```

### Create PM2 Ecosystem File

Create `ecosystem.config.js` in your project root:

```javascript
module.exports = {
  apps: [{
    name: 'jecrc-no-dues',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/jecrc-no-dues',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop jecrc-no-dues

# Restart application
pm2 restart jecrc-no-dues

# Delete application
pm2 delete jecrc-no-dues

# View logs
pm2 logs jecrc-no-dues

# Monitor
pm2 monit

# List all processes
pm2 list

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
pm2 save
```

## 🌐 Nginx Reverse Proxy Configuration

### Basic Configuration (Single Domain)

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/jecrc-no-dues
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Client body size limit (for file uploads)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3001;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # API routes - no caching
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Multiple Applications Configuration

```nginx
# App 1 on subdomain
server {
    listen 80;
    server_name app1.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        # ... proxy settings
    }
}

# JECRC No Dues on main domain
server {
    listen 80;
    server_name nodues.jecrc.ac.in;
    
    location / {
        proxy_pass http://localhost:3001;
        # ... proxy settings
    }
}

# App 3 on different subdomain
server {
    listen 80;
    server_name app3.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3002;
        # ... proxy settings
    }
}
```

### Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/jecrc-no-dues /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔒 SSL Certificate with Let's Encrypt

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificate

```bash
# For single domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# For multiple subdomains
sudo certbot --nginx -d nodues.jecrc.ac.in

# Follow the prompts:
# 1. Enter email address
# 2. Agree to terms
# 3. Choose whether to redirect HTTP to HTTPS (recommended: yes)
```

### Auto-renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
# Verify it's active:
sudo systemctl status certbot.timer
```

## 🔥 Firewall Configuration

```bash
# Allow Nginx
sudo ufw allow 'Nginx Full'

# Allow SSH
sudo ufw allow OpenSSH

# Allow custom port if accessing directly (optional)
sudo ufw allow 3001/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## 📊 Monitoring and Maintenance

### View Application Logs

```bash
# PM2 logs
pm2 logs jecrc-no-dues

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

### Monitor Resources

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# PM2 monitoring
pm2 monit
```

### Backup Strategy

```bash
# Create backup script
nano /home/$USER/backup-app.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/jecrc-no-dues

# Backup environment variables (encrypted recommended)
cp /var/www/jecrc-no-dues/.env.local $BACKUP_DIR/env_$DATE.backup

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and schedule:

```bash
chmod +x /home/$USER/backup-app.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/$USER/backup-app.sh
```

## 🔄 Deployment Updates

### Update Application

```bash
cd /var/www/jecrc-no-dues

# Pull latest changes
git pull origin main

# Install new dependencies
npm install --legacy-peer-deps

# Rebuild
npm run build

# Restart PM2
pm2 restart jecrc-no-dues

# Clear PM2 logs (optional)
pm2 flush
```

### Zero-Downtime Deployment

```bash
# Use PM2 reload instead of restart
pm2 reload jecrc-no-dues
```

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>

# Or use fuser
sudo fuser -k 3001/tcp
```

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs jecrc-no-dues --err

# Check Node.js version
node --version

# Rebuild node modules
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Nginx 502 Bad Gateway

```bash
# Check if app is running
pm2 list

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify port in Nginx config matches app port
sudo nano /etc/nginx/sites-available/jecrc-no-dues

# Test Nginx config
sudo nginx -t

# Restart services
pm2 restart jecrc-no-dues
sudo systemctl restart nginx
```

### High Memory Usage

```bash
# Increase PM2 memory limit
pm2 start ecosystem.config.js --max-memory-restart 2G

# Enable cluster mode for better resource usage
# In ecosystem.config.js, set: instances: 'max'
```

## 📝 Performance Optimization

### Enable Nginx Caching

```nginx
# Add to http block in /etc/nginx/nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;

# In your site config
location /_next/static {
    proxy_cache my_cache;
    proxy_pass http://localhost:3001;
}
```

### Enable Gzip Compression

```nginx
# Already in nginx.conf, verify it's uncommented:
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### PM2 Cluster Mode

For better performance with multiple CPU cores:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'jecrc-no-dues',
    script: 'npm',
    args: 'start',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    // ... other configs
  }]
};
```

## 🎉 Deployment Complete!

Your application is now running at:
- **Local:** `http://localhost:3001`
- **Public:** `https://yourdomain.com`

### Quick Commands Reference

```bash
# Start app
pm2 start ecosystem.config.js

# View logs
pm2 logs jecrc-no-dues

# Restart app
pm2 restart jecrc-no-dues

# Stop app
pm2 stop jecrc-no-dues

# Monitor
pm2 monit

# Update app
cd /var/www/jecrc-no-dues && git pull && npm install --legacy-peer-deps && npm run build && pm2 reload jecrc-no-dues
```

## 📞 Support Resources

- **Nginx Docs:** https://nginx.org/en/docs/
- **PM2 Docs:** https://pm2.keymetrics.io/docs/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Next.js Deployment:** https://nextjs.org/docs/deployment