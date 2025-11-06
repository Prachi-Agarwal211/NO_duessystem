# 🚀 Setup Commands - Quick Reference

## Step-by-Step Setup Commands

### Step 1: Check Environment Variables
```bash
npm run check-env
```
**What it does:** Verifies all required environment variables are set in `.env.local`

---

### Step 2: Generate Cleanup SQL (Optional - only if cleaning database)
```bash
npm run setup:cleanup-sql
```
**What it does:** Creates `supabase/cleanup.sql` file for cleaning the database
**Note:** Then go to Supabase Dashboard > SQL Editor and run the cleanup.sql file

---

### Step 3: Setup Storage Buckets
```bash
npm run setup:storage
```
**What it does:** Creates/updates storage buckets (`certificates` and `alumni-screenshots`)

---

### Step 4: Setup Database Schema (Manual)
**Go to Supabase Dashboard:**
1. Open your Supabase project
2. Go to **SQL Editor**
3. Open `supabase/schema.sql` file from this project
4. Copy the **entire contents**
5. Paste into SQL Editor
6. Click **Run** to execute

**Alternative:** If you have the schema in SQL Editor, you can also run it there directly.

---

### Step 5: Verify Complete Setup
```bash
npm run setup:verify
```
or
```bash
npm run setup
```
**What it does:** 
- Checks Supabase connection
- Creates storage buckets
- Verifies all database tables exist
- Checks departments are populated
- Shows summary of what's working/missing

---

## Complete Setup Flow (All Commands)

### Option A: Automated (Recommended)
```bash
# One command does everything
npm run setup:all
```
Then manually run `supabase/schema.sql` in Supabase Dashboard if tables don't exist.

### Option B: Step by Step
Run these commands in order:

```bash
# 1. Check environment variables
npm run check-env

# 2. Complete setup (or use setup:all for everything)
npm run setup:all

# 3. Then manually run schema.sql in Supabase Dashboard > SQL Editor (if needed)

# 4. Verify everything is set up
npm run setup:verify
```

---

## 🚀 ONE COMMAND SETUP (Recommended)

**Run everything at once:**

```bash
npm run setup:all
```

**What it does:**
- ✅ Generates cleanup SQL file
- ✅ Cleans existing data (if any)
- ✅ Sets up storage buckets
- ✅ Verifies database tables
- ✅ Creates setup report
- ✅ Shows complete status

**This is the easiest way to set up everything!**

---

## Quick Setup (One Command After Schema)

If you've already run the schema in Supabase Dashboard:

```bash
npm run setup
```

This will:
- ✅ Check connection
- ✅ Setup storage buckets
- ✅ Verify database tables
- ✅ Show you what's working

---

## Troubleshooting Commands

### Check if .env.local exists:
```bash
# Windows PowerShell
Test-Path .env.local

# Windows CMD
if exist .env.local (echo exists) else (echo not found)

# Linux/Mac
ls -la .env.local
```

### View environment variables (partial):
```bash
# Windows PowerShell (to see if variables are loaded)
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL ? 'URL set' : 'URL missing')"

# Or just run
npm run check-env
```

---

## Manual Database Setup Commands

If scripts don't work, you can manually:

### 1. Clean Database (in Supabase SQL Editor):
```sql
-- Copy contents of supabase/cleanup.sql and run in Supabase Dashboard
```

### 2. Create Schema (in Supabase SQL Editor):
```sql
-- Copy contents of supabase/schema.sql and run in Supabase Dashboard
```

### 3. Create Storage Buckets (in Supabase Dashboard):
- Go to **Storage** > **Buckets** > **New Bucket**
- Create:
  - **Name:** `certificates` | **Public:** ✅ | **Size:** 10MB
  - **Name:** `alumni-screenshots` | **Public:** ✅ | **Size:** 5MB

---

## Development Commands

### Start Development Server:
```bash
npm run dev
```

### Build for Production:
```bash
npm run build
```

### Start Production Server:
```bash
npm start
```

---

## All Available Scripts

```bash
# Setup Scripts
npm run setup:all              # ⭐ COMPLETE SETUP (clean + setup everything)
npm run check-env              # Check environment variables
npm run setup                  # Complete setup verification
npm run setup:storage          # Create/update storage buckets
npm run setup:verify           # Verify complete setup
npm run setup:cleanup-sql      # Generate cleanup SQL script

# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Run ESLint

# Testing
npm test                       # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Run tests with coverage
npm run test:api               # Test API routes only
npm run test:components        # Test React components only
npm run test:integration       # Test integration scenarios
```

---

## Expected Output

### ✅ Successful Setup:
```
✅ All required environment variables are set!
✅ Connected to Supabase
✅ Created bucket: certificates
✅ Created bucket: alumni-screenshots
✅ profiles: OK
✅ departments: OK (12 found)
✅ no_dues_forms: OK
✅ no_dues_status: OK
✅ audit_log: OK
✅ notifications: OK
✅ Setup verification complete!
```

### ⚠️ Issues Found:
The scripts will tell you exactly what's missing and how to fix it.

---

## Quick Start (TL;DR)

### Easiest Way (One Command):
```bash
npm run setup:all
```
Then if needed: Run `supabase/schema.sql` in Supabase Dashboard > SQL Editor

### Step-by-Step:
1. **Check env vars:** `npm run check-env`
2. **Complete setup:** `npm run setup:all`
3. **Run schema.sql in Supabase Dashboard** (if tables missing)
4. **Verify:** `npm run setup:verify`
5. **Start dev:** `npm run dev`

---

**Need help?** Check `COMPLETE_SETUP_GUIDE.md` for detailed instructions.

