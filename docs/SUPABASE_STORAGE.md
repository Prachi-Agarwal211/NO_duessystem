# Supabase Storage Setup Instructions

## Required Storage Buckets

Your application now uses the **`no-dues-files`** bucket for all file uploads, including manual certificate entries.

## Setup Steps

### 1. Create Storage Bucket (If Not Already Created)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Enter the following details:
   - **Name:** `no-dues-files`
   - **Public bucket:** ✅ **YES** (Check this - required for public URLs)
   - **Allowed MIME types:** Leave empty or add: `image/jpeg, image/png, image/webp, image/gif, application/pdf`
   - **File size limit:** 10 MB (or as needed)
5. Click **"Create bucket"**

### 2. Configure Storage Policies (RLS)

After creating the bucket, you need to set up Row Level Security (RLS) policies:

#### Policy 1: Allow Public Read Access
```sql
-- Allow anyone to view files (needed for public URLs)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'no-dues-files');
```

#### Policy 2: Allow Authenticated Uploads
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'no-dues-files');
```

#### Policy 3: Allow Users to Update Their Own Files
```sql
-- Allow users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'no-dues-files' AND auth.uid() = owner);
```

#### Policy 4: Allow Users to Delete Their Own Files
```sql
-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'no-dues-files' AND auth.uid() = owner);
```

### 3. Apply Policies in Supabase

**Option A: Using SQL Editor**
1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste each policy above
3. Run each query individually

**Option B: Using Storage Policies UI**
1. Go to **Storage** → Click on `no-dues-files` bucket
2. Navigate to **Policies** tab
3. Click **"New Policy"**
4. Use the SQL editor to create policies

### 4. Verify Setup

Test the storage by:
1. Going to https://no-duessystem.vercel.app/student/manual-entry
2. Try uploading a test certificate
3. Check if the file appears in Supabase Storage under `no-dues-files/manual-entries/`

### 5. Environment Variables (Already Configured)

Make sure these are set in your Vercel/deployment environment:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://no-duessystem.vercel.app
```

## File Organization Structure

After setup, files will be organized as:
```
no-dues-files/
├── manual-entries/
│   └── REGISTRATION_NO_TIMESTAMP.ext
└── [user-id]/
    └── [other-uploads]
```

## Troubleshooting

### Issue: "Bucket does not exist"
- **Solution:** Create the `no-dues-files` bucket following Step 1

### Issue: "Upload failed: new row violates row-level security policy"
- **Solution:** Apply the RLS policies from Step 2

### Issue: "Public URL not working"
- **Solution:** Ensure the bucket is set to **Public** (check bucket settings)

### Issue: "File too large"
- **Solution:** Increase bucket file size limit in bucket settings (recommended: 10MB)

## Security Notes

✅ **Public bucket is safe** because:
- Only uploaded files can be accessed via their specific URLs
- File names are timestamped and unique
- RLS policies prevent unauthorized uploads
- No directory listing is exposed

✅ **Files are organized** by:
- Manual entries go to: `manual-entries/` folder
- Other uploads go to user-specific folders: `{userId}/` folder

## Additional Configuration (Optional)

### Add File Size Limits
```sql
-- Set maximum file size to 10MB
ALTER TABLE storage.objects 
ADD CONSTRAINT file_size_limit 
CHECK (metadata->>'size'::bigint <= 10485760);
```

### Add MIME Type Restrictions
Configure allowed file types in bucket settings:
- JPEG/JPG images
- PNG images
- WebP images
- GIF images
- PDF documents

---

## Quick Verification Checklist

- [ ] `no-dues-files` bucket exists
- [ ] Bucket is set to **Public**
- [ ] RLS policies are applied (4 policies)
- [ ] Test upload works from manual entry page
- [ ] Files appear in Supabase Storage dashboard
- [ ] Public URLs are accessible

## Support

If you encounter any issues:
1. Check Supabase logs in Dashboard → Logs
2. Check browser console for detailed error messages
3. Verify environment variables are set correctly in Vercel
4. Ensure bucket permissions are public