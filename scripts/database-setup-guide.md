# Database Setup Guide for JECRC No Dues System

## Important: Manual Database Schema Execution Required

The database schema needs to be executed manually in your Supabase project before the application can fully function.

### Steps to Set Up Database:

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project (mwgnaxtellujiflcrahf)

2. **Open SQL Editor**
   - Navigate to "SQL Editor" in the left sidebar
   - Click "New query" to open a new SQL editor tab

3. **Execute Schema**
   - Copy the entire content from `prompts/01_database_schema.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the schema

4. **Verify Tables Created**
   - After execution, go to "Table Editor" in the left sidebar
   - You should see the following tables:
     - `profiles`
     - `departments`
     - `no_dues_forms`
     - `no_dues_status`
     - `audit_log`
     - `notifications`

5. **Set Up Storage Buckets**
   - Go to "Storage" in the left sidebar
   - Create the following buckets if they don't exist:
     - `alumni-screenshots` - For student alumni screenshots
     - `certificates` - For generated PDF certificates
     - `avatars` - For user profile images (already in schema)

6. **Set Up Storage Policies**
   - For each bucket, set up appropriate RLS policies:
   - Example for alumni-screenshots bucket:
     ```sql
     CREATE POLICY "Users can upload their own screenshots" ON storage.objects
       FOR INSERT WITH CHECK (
         bucket_id = 'alumni-screenshots' AND 
         auth.uid()::text = (storage.foldername(name))[1]
       );
     
     CREATE POLICY "Users can view their own screenshots" ON storage.objects
       FOR SELECT USING (
         bucket_id = 'alumni-screenshots' AND 
         auth.uid()::text = (storage.foldername(name))[1]
       );
     ```

### Alternative: Using Supabase CLI

If you want to use the Supabase CLI for automated setup:

1. Install the Supabase CLI:
   - Windows: `winget install Supabase.CLI`
   - Mac: `brew install supabase/tap/supabase`
   - Linux: Follow instructions at https://github.com/supabase/cli

2. Link to your project:
   ```bash
   supabase link --project-ref mwgnaxtellujiflcrahf
   ```

3. Push the schema:
   ```bash
   supabase db push
   ```

### After Database Setup

Once the database is set up, the application should be able to:
- Create and manage user profiles
- Process no-dues applications
- Track department approvals
- Generate certificates
- Send notifications

### Troubleshooting

If you encounter any issues:
1. Ensure all tables were created successfully
2. Check that RLS policies are in place
3. Verify storage buckets exist with appropriate policies
4. Check the browser console for any errors