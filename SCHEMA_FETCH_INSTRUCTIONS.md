# Supabase Schema Fetching Instructions

## Overview

I've created two scripts to help you fetch the actual schema from your Supabase database:

1. **fetch_live_schema.js** - Fetches all tables and their schemas
2. **get_core_schema.js** - Focuses on core NoDues system tables

## Prerequisites

### 1. Node.js Installation

You need Node.js installed on your local machine:

- Download from [https://nodejs.org/](https://nodejs.org/)
- Recommended version: LTS (Long Term Support) version
- Verify installation: `node -v` and `npm -v`

### 2. Supabase Credentials

You need your Supabase service role key. This should be available in:
- Your Supabase project settings under "API"
- The `.env.local` file in your project (if already configured)

## Setup Instructions

### 1. Install Required Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Configure Your Credentials

#### Option A: Environment Variable (Recommended)

Create or update your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

#### Option B: Direct in Script

Edit the scripts and replace:
```javascript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';
```

With your actual key:
```javascript
const supabaseKey = 'your-actual-service-role-key-here';
```

## Running the Scripts

### Run fetch_live_schema.js (All Tables)

```bash
node fetch_live_schema.js
```

This will:
- Connect to your Supabase database
- Fetch all tables from the public schema
- Display column information and sample data
- Output everything to the console

### Run get_core_schema.js (Core Tables Only)

```bash
node get_core_schema.js
```

This will:
- Connect to your Supabase database
- Focus on the 10 core NoDues tables
- Display detailed schema information
- Show sample data for each table

## Expected Output

Both scripts will output:

1. Connection status
2. Table names and structures
3. Column names and data types
4. Sample data (3-5 rows per table)
5. Completion message

## Troubleshooting

### Common Issues

1. **Connection Errors**:
   - Verify your Supabase URL is correct
   - Check your service role key is valid
   - Ensure your network allows connections to Supabase

2. **Permission Errors**:
   - Make sure you're using the service role key (not anon/public key)
   - The service role key bypasses RLS policies

3. **Missing Tables**:
   - Some tables might not exist in your database
   - The scripts handle missing tables gracefully

### Debugging

Add `console.log` statements to the scripts to debug specific issues.

## Security Notes

- **Never commit your service role key** to version control
- Keep your `.env.local` file in `.gitignore`
- Use environment variables for sensitive credentials
- Delete the scripts after use if they contain hardcoded keys

## Alternative Methods

If these scripts don't work, you can also:

1. Use Supabase Dashboard: Go to Table Editor → View all tables
2. Use Supabase CLI: `supabase db dump`
3. Use pgAdmin or other PostgreSQL tools to connect directly

## Next Steps

After fetching your schema:

1. Compare with your existing SQL scripts
2. Update your database documentation
3. Identify any discrepancies
4. Use the accurate schema for development