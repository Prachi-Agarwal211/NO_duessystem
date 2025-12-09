# 🚀 AWS Complete Deployment Guide
**JECRC No Dues System - Full AWS Hosting**

*Last Updated: 2025-12-09*  
*Deployment Method: AWS Amplify + Supabase + Resend*

---

## 📋 Overview

This guide will help you deploy your Next.js application to AWS completely. We'll use:

- **AWS Amplify** - For hosting the Next.js application
- **Supabase** - For database and authentication (external service)
- **Resend** - For email notifications (external service)
- **AWS CloudFront** - For CDN (auto-configured by Amplify)
- **AWS Route 53** - For domain management (optional)

**Total Setup Time**: ~1.5 hours  
**Monthly Cost**: ~$5-20 USD (depends on traffic)

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AWS INFRASTRUCTURE                    │
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │         AWS Amplify (Frontend)            │          │
│  │  - Next.js Application Hosting            │          │
│  │  - Automatic SSL/TLS                      │          │
│  │  - Auto Scaling                           │          │
│  │  - CI/CD from GitHub                      │          │
│  └──────────────┬───────────────────────────┘          │
│                 │                                        │
│  ┌──────────────▼───────────────────────────┐          │
│  │       CloudFront CDN (Auto)               │          │
│  │  - Global Content Delivery                │          │
│  │  - HTTPS Enforcement                      │          │
│  │  - Caching                                │          │
│  └──────────────┬───────────────────────────┘          │
│                 │                                        │
│  ┌──────────────▼───────────────────────────┐          │
│  │     Route 53 (Optional - DNS)             │          │
│  │  - Domain Management                      │          │
│  │  - Health Checks                          │          │
│  └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
   │Supabase │   │  Resend   │  │  Users  │
   │Database │   │   Email   │  │ Browser │
   └─────────┘   └───────────┘  └─────────┘
```

---

## 🔧 Prerequisites

Before starting, you need:

### 1. AWS Account
- Sign up at [aws.amazon.com](https://aws.amazon.com)
- Credit card required (free tier available)
- Root account or IAM user with admin access

### 2. GitHub Account
- Repository with your code
- Personal access token (for Amplify)

### 3. External Services
- **Supabase** account ([supabase.com](https://supabase.com))
- **Resend** account ([resend.com](https://resend.com))

### 4. Domain (Optional)
- Custom domain from any registrar
- Or use AWS Route 53 to register one

---

## 📝 Step 1: Prepare Your Application (15 minutes)

### 1.1 Update `package.json`

Ensure your build script is correct:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 1.2 Create `amplify.yml` Build Configuration

Create this file in your project root:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### 1.3 Configure Environment Variables File

Create `.env.production`:

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend Email
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=noreply@jecrc.ac.in

# Application
NEXT_PUBLIC_APP_URL=https://nodues.jecrc.ac.in

# JWT Secret (generate new for production)
JWT_SECRET=your-production-jwt-secret-here
```

**⚠️ DO NOT commit this file to Git!**

Add to `.gitignore`:
```
.env.local
.env.production
```

### 1.4 Push to GitHub

```bash
# Add amplify.yml
git add amplify.yml

# Commit
git commit -m "Add AWS Amplify configuration"

# Push to main branch
git push origin main
```

---

## 🚀 Step 2: Deploy with AWS Amplify (30 minutes)

### 2.1 Access AWS Amplify Console

1. Login to [AWS Console](https://console.aws.amazon.com)
2. Search for "Amplify" in the services search bar
3. Click **AWS Amplify**
4. Click **Get Started** under "Amplify Hosting"

### 2.2 Connect GitHub Repository

1. **Select Repository Provider**: Choose **GitHub**
2. **Authorize AWS Amplify**: Click **Authorize**
   - Sign in to GitHub if prompted
   - Grant AWS Amplify access to your repositories
3. **Select Repository**: 
   - Repository: `your-username/jecrc-no-dues-system`
   - Branch: `main`
4. Click **Next**

### 2.3 Configure Build Settings

AWS Amplify will auto-detect Next.js. Verify settings:

**App name**: `jecrc-no-dues-system`

**Build settings**:
- Should auto-populate from `amplify.yml`
- If not detected, paste the amplify.yml content

**Advanced settings** (click to expand):

#### Environment Variables (CRITICAL)

Add all environment variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJxxx...` (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx...` (service role - **mark as secret**) |
| `RESEND_API_KEY` | `re_xxx...` (**mark as secret**) |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` |
| `NEXT_PUBLIC_APP_URL` | `https://main.xxxxx.amplifyapp.com` (temporary, update after custom domain) |
| `JWT_SECRET` | `generated-secret-here` (**mark as secret**) |

**Important**: For sensitive values (service role key, JWT secret, Resend API key), check the "**Secret**" checkbox to encrypt them.

Click **Next**

### 2.4 Review and Deploy

1. Review all settings
2. Click **Save and Deploy**

**Deployment Process** (10-15 minutes):
```
✓ Provision     (1 min)  - Setting up infrastructure
✓ Build         (5 min)  - npm install & npm run build
✓ Deploy        (2 min)  - Uploading to CloudFront
✓ Verify        (1 min)  - Health checks
```

### 2.5 Access Your Application

Once deployed:
1. You'll see a URL: `https://main.xxxxx.amplifyapp.com`
2. Click the URL to open your application
3. ✅ Verify: Homepage loads successfully

---

## 🔐 Step 3: Configure Custom Domain (20 minutes)

### Option A: Use Existing Domain (Recommended)

#### 3.1 Add Domain in Amplify

1. In Amplify Console → **Domain management**
2. Click **Add domain**
3. Enter your domain: `jecrc.ac.in`
4. Click **Configure domain**

#### 3.2 Configure Subdomains

Amplify will suggest configuration:

```
subdomain: nodues
Target: main branch
URL: nodues.jecrc.ac.in
```

Click **Save**

#### 3.3 Update DNS Records

Amplify will show DNS records to add:

**Example**:
```
Type: CNAME
Name: nodues
Value: main.xxxxx.amplifyapp.com
TTL: 300
```

**Add to your DNS provider**:

1. Login to your domain registrar (e.g., GoDaddy, Namecheap, Hostinger)
2. Go to DNS Management
3. Add new CNAME record:
   - **Host/Name**: `nodues`
   - **Points to/Value**: `main.xxxxx.amplifyapp.com`
   - **TTL**: 300 (or auto)
4. Save changes

#### 3.4 Wait for SSL Certificate

AWS will automatically:
- Verify domain ownership (5-10 minutes)
- Issue SSL certificate via AWS Certificate Manager
- Configure HTTPS

Status: **Pending verification** → **Available** (10-30 minutes)

#### 3.5 Update Environment Variable

Once domain is active:

1. Amplify Console → **Environment variables**
2. Edit `NEXT_PUBLIC_APP_URL`
3. Change to: `https://nodues.jecrc.ac.in`
4. **Save**
5. **Redeploy**: Click Actions → Redeploy this version

### Option B: Use Route 53 (AWS Managed)

If your domain is in Route 53 or you want to transfer it:

1. Amplify Console → **Domain management** → **Add domain**
2. Select domain from Route 53 dropdown
3. Amplify will automatically configure everything
4. No manual DNS changes needed!

---

## 💾 Step 4: Database & Services Setup (Same as Before)

### 4.1 Supabase Configuration

*Same as in [`COMPLETE_DEPLOYMENT_GUIDE.md`](COMPLETE_DEPLOYMENT_GUIDE.md) Step 2*

1. Run database migrations:
   - `scripts/unify-notification-system.sql`
   - `scripts/update-department-order.sql`
   - `scripts/add-manual-entry-system.sql`

2. Create storage buckets:
   - `student-documents`
   - `manual-certificates`

3. Configure RLS policies

### 4.2 Create Admin Account

```bash
# Set production Supabase credentials
export NEXT_PUBLIC_SUPABASE_URL="https://your-prod.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-prod-service-key"

# Create admin
node scripts/create-admin-account.js
```

### 4.3 Configure Resend

1. Verify domain in Resend dashboard
2. Add DNS records (SPF, DKIM, DMARC)
3. Update `RESEND_FROM_EMAIL` to your verified domain

---

## 🔄 Step 5: CI/CD Setup (Automatic)

AWS Amplify automatically sets up CI/CD:

### How It Works

```
Developer pushes to GitHub
         ↓
GitHub webhook triggers Amplify
         ↓
Amplify pulls latest code
         ↓
Runs build (amplify.yml)
         ↓
Deploys to CloudFront
         ↓
Application updated (2-5 minutes)
```

### Configure Branch Deployments

#### Production Branch (main)
- **Auto deploy**: Enabled
- **Domain**: nodues.jecrc.ac.in

#### Development Branch (optional)
1. Amplify Console → **App settings** → **Branch deployments**
2. Click **Connect branch**
3. Select: `dev` or `staging`
4. Auto deploy: Enabled
5. Domain: `dev.xxxxx.amplifyapp.com`

### Deployment Notifications

Set up email notifications:

1. Amplify Console → **Notifications**
2. Click **Create notification**
3. Email: your-email@jecrc.ac.in
4. Events:
   - Deployment started
   - Deployment succeeded
   - Deployment failed

---

## 📊 Step 6: Monitoring & Logging (15 minutes)

### 6.1 CloudWatch Logs

AWS Amplify automatically sends logs to CloudWatch:

1. AWS Console → **CloudWatch**
2. **Logs** → **Log groups**
3. Find: `/aws/amplify/jecrc-no-dues-system`

**Log types**:
- Access logs (HTTP requests)
- Build logs (deployment)
- Function logs (API routes)

### 6.2 Amplify Monitoring

In Amplify Console:

**Metrics** tab shows:
- Requests per minute
- Data transferred
- 4xx/5xx errors
- Response time

**Alarms** can be set for:
- High error rate (>5%)
- Slow response time (>2s)
- High traffic (>1000 req/min)

### 6.3 Custom Monitoring

Add **AWS X-Ray** for detailed tracing:

1. Amplify Console → **App settings** → **Monitoring**
2. Enable **AWS X-Ray**
3. View trace maps and latency analysis

---

## 💰 Step 7: Cost Optimization (10 minutes)

### 7.1 Understand Costs

**AWS Amplify Pricing** (As of 2024):

**Build minutes**:
- First 1,000 minutes/month: FREE
- Additional: $0.01 per minute

**Hosting**:
- Data transfer out: $0.15 per GB
- Data storage: $0.023 per GB/month
- Typically: $5-15/month for small apps

**CloudFront**:
- First 1 TB/month: Free tier
- Additional: $0.085 per GB (India)

**Estimated Monthly Cost**:
- Low traffic (< 10k visits): **$5-10**
- Medium traffic (10k-50k visits): **$10-20**
- High traffic (> 50k visits): **$20-50**

### 7.2 Enable Cost Alerts

1. AWS Console → **Billing**
2. **Budgets** → **Create budget**
3. Budget type: **Cost budget**
4. Amount: $20 per month
5. Alert threshold: 80% ($16)
6. Email: your-email@jecrc.ac.in

### 7.3 Optimize Costs

**Enable caching**:
- Already done via CloudFront
- Static assets cached at edge
- Reduces origin requests

**Optimize images**:
- Use Next.js Image component
- Automatic optimization
- WebP format support

**Code splitting**:
- Next.js does this automatically
- Only load required code
- Reduces bundle size

---

## 🔒 Step 8: Security Hardening (15 minutes)

### 8.1 AWS WAF (Web Application Firewall)

Protect against common attacks:

1. AWS Console → **WAF & Shield**
2. **Create web ACL**
3. Resource: CloudFront distribution (Amplify's)
4. Add rules:
   - AWS Managed Rules → Core rule set
   - Rate-based rule: Block if >2000 req/5min from single IP
   - Geo blocking (optional): Allow only India

Cost: ~$5/month + $1 per rule

### 8.2 Environment Variables Security

Verify sensitive vars are encrypted:

1. Amplify Console → **Environment variables**
2. Check **Secret** is enabled for:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `RESEND_API_KEY`

### 8.3 HTTPS Enforcement

Already enabled by Amplify, verify:

1. Amplify Console → **Domain management**
2. Check: **Redirect HTTP to HTTPS** is ON

### 8.4 Security Headers

Add security headers in `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

Commit and push to trigger redeployment.

---

## 🧪 Step 9: Testing in Production (20 minutes)

### 9.1 Smoke Tests

Test at `https://nodues.jecrc.ac.in`:

- [ ] Homepage loads
- [ ] Admin login works
- [ ] Staff login works
- [ ] Student form submission
- [ ] Email notifications received
- [ ] CSV exports work
- [ ] Certificate generation
- [ ] Manual entry system
- [ ] Mobile responsive
- [ ] All pages load without errors

### 9.2 Performance Testing

Use **Google Lighthouse**:

1. Open Chrome DevTools (F12)
2. **Lighthouse** tab
3. Select: **Performance**, **Accessibility**, **Best Practices**, **SEO**
4. Click **Analyze page load**

**Target Scores**:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### 9.3 Load Testing (Optional)

Use Apache Bench for basic load test:

```bash
# Install Apache Bench
# Ubuntu/Mac: already installed
# Windows: Download from https://httpd.apache.org/

# Test with 100 concurrent users, 1000 requests
ab -n 1000 -c 100 https://nodues.jecrc.ac.in/

# Check results:
# - Requests per second
# - Time per request
# - Failed requests (should be 0)
```

---

## 🔄 Step 10: Backup & Disaster Recovery (15 minutes)

### 10.1 Database Backups (Supabase)

1. Supabase Dashboard → **Settings** → **Backups**
2. **Enable automatic backups**:
   - Frequency: Daily
   - Retention: 7 days
   - Time: 2:00 AM UTC (7:30 AM IST)

### 10.2 Code Backups (GitHub)

Already done! Your code is in GitHub.

**Best practices**:
- Create release tags for major versions
- Protect main branch (require PR reviews)
- Enable branch protection rules

### 10.3 Disaster Recovery Plan

**If application goes down**:

1. **Check AWS Status**: https://status.aws.amazon.com
2. **Check Amplify Console**: Look for deployment errors
3. **Rollback**: Amplify Console → Deployments → Redeploy previous version
4. **Check logs**: CloudWatch logs for error messages

**If database goes down**:

1. **Check Supabase Status**: https://status.supabase.com
2. **Contact support**: support@supabase.com
3. **Restore from backup** if needed

**Recovery Time Objective (RTO)**: < 1 hour  
**Recovery Point Objective (RPO)**: Last 24 hours (daily backups)

---

## 📱 Step 11: User Rollout Strategy (10 minutes)

### Phase 1: Internal Testing (Week 1)
- Admin + 2 staff members
- Test all workflows
- Fix any issues
- Gather feedback

### Phase 2: Department Rollout (Week 2)
- Add all department staff
- Train staff members
- Monitor closely
- Support tickets via email

### Phase 3: Limited Student Access (Week 3)
- Announce to one school/branch
- ~100-200 students
- Monitor performance
- Quick issue resolution

### Phase 4: Full Launch (Week 4)
- Announce to all students
- Email announcement
- Website banner
- Support ready

### Rollback Plan
If major issues in any phase:
1. Stop new registrations
2. Fix issues
3. Test thoroughly
4. Resume from previous phase

---

## 🎓 Step 12: Training & Documentation

### 12.1 Admin Training Session (1 hour)

Topics:
1. Dashboard overview
2. Staff management
3. Department configuration
4. Manual entry review
5. Reports & CSV export
6. Troubleshooting common issues

**Materials**:
- Screen recording of admin workflows
- PDF quick reference guide
- FAQ document

### 12.2 Staff Training Session (1 hour)

Topics:
1. Login process
2. Viewing pending applications
3. Approve/reject workflow
4. Handling reapplications
5. CSV export for records
6. Contact support

**Materials**:
- Video tutorial
- Step-by-step PDF guide
- FAQ document

### 12.3 Student Communication

**Email Template**:

```
Subject: New Online No Dues System - Apply Now!

Dear Students,

We're excited to announce our new Online No Dues Clearance System!

🌐 Website: https://nodues.jecrc.ac.in

📝 How to Apply:
1. Visit the website
2. Click "Apply for No Dues"
3. Fill in your details
4. Upload documents
5. Track status online

📊 Track Your Application:
- Click "Check Status"
- Enter registration number
- View department-wise approval status

📧 Already Completed Offline?
- Click "Register Certificate"
- Upload your certificate
- Admin will verify

Need Help?
📧 Email: nodues.support@jecrc.ac.in
📞 Phone: [Your helpdesk number]

Thank you,
JECRC Administration
```

---

## 🛠️ Maintenance & Updates

### Daily Tasks
- [ ] Check CloudWatch for errors
- [ ] Review Amplify deployment status
- [ ] Check email delivery (Resend dashboard)
- [ ] Monitor user feedback

### Weekly Tasks
- [ ] Review AWS costs (Billing dashboard)
- [ ] Check security alerts
- [ ] Review application performance
- [ ] Update documentation if needed

### Monthly Tasks
- [ ] Database backup verification
- [ ] Security audit
- [ ] Performance optimization
- [ ] Dependency updates (`npm audit fix`)
- [ ] User feedback analysis

### Quarterly Tasks
- [ ] Major version updates
- [ ] Security penetration testing
- [ ] Disaster recovery drill
- [ ] Cost optimization review

---

## 🆘 Common Issues & Solutions

### Issue 1: Build Fails in Amplify

**Symptoms**: Deployment fails at build stage

**Solutions**:
```bash
# Check build logs in Amplify Console
# Common fixes:

# 1. Clear cache and rebuild
Amplify Console → Redeploy → Clear cache

# 2. Check Node version
# In amplify.yml, specify Node version:
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm install 18
        - nvm use 18
        - npm ci

# 3. Check environment variables
# Ensure all required vars are set
```

### Issue 2: Environment Variables Not Working

**Symptoms**: Application can't connect to Supabase/Resend

**Solutions**:
1. Amplify Console → **Environment variables**
2. Verify all keys match `.env.production`
3. Check no trailing spaces in values
4. Mark sensitive vars as **Secret**
5. **Redeploy** after changes

### Issue 3: Custom Domain Not Working

**Symptoms**: Domain shows error or doesn't resolve

**Solutions**:
```bash
# 1. Check DNS propagation
nslookup nodues.jecrc.ac.in

# 2. Verify CNAME record
# Should point to: main.xxxxx.amplifyapp.com

# 3. Wait 24-48 hours for full DNS propagation

# 4. Check SSL certificate status
# Amplify Console → Domain management
# Should show: Available (green checkmark)
```

### Issue 4: High AWS Costs

**Symptoms**: Unexpected bill from AWS

**Solutions**:
1. Check **Cost Explorer** in AWS Console
2. Identify high-cost services
3. Common causes:
   - CloudFront data transfer (enable caching)
   - Build minutes (reduce rebuild frequency)
   - WAF rules (optimize rules)
4. Set up cost alerts (see Step 7.2)

### Issue 5: Slow Performance

**Symptoms**: Pages loading slowly

**Solutions**:
```bash
# 1. Check CloudFront cache hit ratio
AWS Console → CloudFront → Monitoring
Target: > 80% cache hit ratio

# 2. Optimize images
# Use Next.js Image component everywhere

# 3. Enable compression
# Already enabled in Amplify by default

# 4. Reduce JavaScript bundle size
npm run build -- --analyze
# Review and remove unused dependencies
```

---

## 📊 Monitoring Dashboard Setup

### CloudWatch Dashboard

Create custom dashboard:

1. AWS Console → **CloudWatch** → **Dashboards**
2. **Create dashboard**: "JECRC-NoDues-Monitor"
3. Add widgets:

**Application Metrics**:
- Requests per minute (line graph)
- Error rate % (number widget)
- Response time P95 (line graph)
- Data transferred (line graph)

**Cost Metrics**:
- Month-to-date spend (number widget)
- Projected monthly cost (number widget)

**Database Metrics** (from Supabase):
- Active connections
- Query performance
- Storage usage

### Grafana (Advanced, Optional)

For advanced monitoring:
1. Deploy Grafana on AWS ECS
2. Connect to CloudWatch data source
3. Import AWS Amplify dashboard template
4. Set up alerts

Cost: ~$10/month for small ECS instance

---

## ✅ Final Production Checklist

### Pre-Launch
- [ ] All database migrations applied
- [ ] Storage buckets configured
- [ ] Admin account created
- [ ] Staff accounts created (all 10 departments)
- [ ] Custom domain configured with SSL
- [ ] Environment variables set correctly
- [ ] Email domain verified in Resend
- [ ] CI/CD pipeline tested
- [ ] Security headers configured
- [ ] Cost alerts set up

### Testing
- [ ] Admin login works
- [ ] Staff login works
- [ ] Student form submission
- [ ] Email notifications sent
- [ ] Department approval workflow
- [ ] Certificate generation
- [ ] Reapplication system
- [ ] Manual entry system
- [ ] CSV exports (admin & staff)
- [ ] Mobile responsive
- [ ] Performance > 90 (Lighthouse)
- [ ] Load test passed (if done)

### Monitoring
- [ ] CloudWatch logs enabled
- [ ] Amplify monitoring active
- [ ] Cost alerts configured
- [ ] Email notifications for deployments
- [ ] Backup schedule verified

### Documentation
- [ ] Admin training completed
- [ ] Staff training completed
- [ ] Student communication sent
- [ ] Support email set up
- [ ] Troubleshooting guide shared

### Compliance
- [ ] Data privacy policy
- [ ] Terms of service
- [ ] GDPR compliance (if applicable)
- [ ] Security audit completed

---

## 🎉 Congratulations!

Your JECRC No Dues System is now fully deployed on AWS!

**What You've Achieved**:
✅ Production-grade Next.js hosting on AWS Amplify  
✅ Global CDN via CloudFront  
✅ Automatic SSL/TLS certificates  
✅ CI/CD pipeline from GitHub  
✅ Custom domain with HTTPS  
✅ Comprehensive monitoring & logging  
✅ Cost-optimized infrastructure  
✅ Disaster recovery plan  
✅ Security hardening  

**Your Application**:
- **URL**: https://nodues.jecrc.ac.in
- **Admin**: https://nodues.jecrc.ac.in/admin
- **Staff**: https://nodues.jecrc.ac.in/staff/login
- **Student**: https://nodues.jecrc.ac.in/student/submit-form

**Useful Links**:
- AWS Amplify Console: https://console.aws.amazon.com/amplify
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch
- Cost Explorer: https://console.aws.amazon.com/cost-management
- Supabase Dashboard: https://supabase.com/dashboard
- Resend Dashboard: https://resend.com/emails

**Support**:
- AWS Support: https://console.aws.amazon.com/support
- Amplify Docs: https://docs.amplify.aws
- Next.js Docs: https://nextjs.org/docs

---

**Deployment Date**: ___________  
**AWS Account ID**: ___________  
**Amplify App ID**: ___________  
**Production URL**: ___________  
**Admin Email**: ___________  

*Keep this guide for reference during updates and maintenance.*