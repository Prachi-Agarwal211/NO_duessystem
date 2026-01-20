# JECRC No Dues System

A comprehensive no dues clearance system for JECRC University built with Next.js, Supabase, and blockchain verification.

## Quick Start

### 1. Database Setup

Run these SQL files in Supabase SQL Editor in order:

```sql
-- 1. Main database schema with all production data
COMPLETE_DATABASE_SETUP.sql
```

### 2. Environment Setup

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@jecrc.ac.in

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Production Data Included

- ✅ 13 Schools
- ✅ 31 Courses
- ✅ 145 Branches
- ✅ 8 Departments
- ✅ 5 Country Codes

## Key Features

- 🎓 Student no dues submission & tracking
- 👥 Multi-department approval workflow
- 📊 Admin dashboard with analytics
- 📧 Email notifications system
- 🔐 Blockchain certificate verification
- 🎫 Support ticket system
- 📱 Fully responsive design

## Useful Scripts

```bash
# Create admin account
node scripts/create-admin-account.js

# Test email configuration
node scripts/test-email-smtp.js

# Generate staff guide PDF
node scripts/generate-staff-guide-pdf.js
```

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Email:** Nodemailer (SMTP)
- **Blockchain:** Custom verification system

## Project Structure

```
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/             # Utilities & services
│   └── middleware/      # Auth middleware
├── scripts/             # Utility scripts
├── data/               # CSV source data
└── public/             # Static assets
```

## Documentation

- `COMPLETE_DATABASE_SETUP.sql` - Complete database schema with production data
- `JECRC-No-Dues-Staff-Guide.pdf` - Staff user guide

## Support

For issues or questions, use the in-app support ticket system.

---

**License:** Proprietary  
**Institution:** JECRC University  
**Year:** 2024-2025