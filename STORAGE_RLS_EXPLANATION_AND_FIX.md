# 🔐 Storage RLS Policies: Why They Exist & How to Fix Them

## The Problem You're Facing

**Error:** `new row violates row-level security policy` when uploading files to `no-dues-files` bucket

**Why it happens:** Supabase Storage has RLS enabled by default to protect files. Your code is trying to upload using a client that doesn't have permission.

---

## Why RLS Policies Exist (Security 101)

### Without RLS:
```
❌ ANYONE can upload files to your bucket
❌ Hackers can fill your storage with malware
❌ Users can delete other users' files
❌ No control over who sees what
```

### With RLS (Current):
```
✅ Only authorized users can upload
✅ Each bucket has specific access rules
✅ Service role bypasses all restrictions
✅ Public can only do what you allow
```

**Example Attack Without RLS:**
```javascript
// Any random person can run this in browser console:
await supabase.storage
  .from('no-dues-files')
  .upload('virus.exe', malwareFile);

// Result: Your storage is now full of malware
```

---

## The REAL Issue: Using Wrong Client

Your manual entry page is using **`supabase`** client (has RLS restrictions) instead of **`supabaseAdmin`** client (bypasses RLS).

**Current Code (BROKEN):**
```javascript
// In ManualEntryModal.jsx or similar
import { supabase } from '@/lib/supabaseClient';

const { data, error } = await supabase.storage
  .from('no-dues-files')  // ❌ RLS blocks this
  .upload(filePath, file);
```

**Why it fails:**
- `supabase` client uses ANON key (public access)
- RLS policies say "only service_role can upload to no-dues-files"
- You're not service_role → **BLOCKED**

---

## 🎯 Solution 1: Use Upload API Route (RECOMMENDED)

**Create a server-side upload endpoint that uses `supabaseAdmin`:**

### Step 1: Create `/api/upload/route.js`

```javascript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket') || 'no-dues-files';
    const folder = formData.get('folder') || 'manual-entries';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${sanitizedName}_${timestamp}`;

    // Upload using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 2: Update Manual Entry Component

```javascript
// In your ManualEntryModal.jsx or similar
const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'no-dues-files');
  formData.append('folder', 'manual-entries');

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }

  return result.url; // Use this URL in your manual entry
};
```

**Benefits:**
✅ Server-side upload uses SERVICE_ROLE key (bypasses RLS)
✅ Frontend stays simple
✅ No security issues
✅ Works with current RLS policies

---

## 🎯 Solution 2: Disable RLS (NOT RECOMMENDED)

If you really want to remove RLS completely:

```sql
-- ⚠️ WARNING: This removes ALL security from your storage buckets
-- Anyone can upload/delete/modify files

-- Make buckets completely public (NO RLS)
UPDATE storage.buckets 
SET public = true 
WHERE name IN ('no-dues-files', 'alumni-screenshots', 'certificates');

-- Drop ALL RLS policies
DROP POLICY IF EXISTS "Service can upload to no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Service can update no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Service can delete no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload alumni screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public can view alumni screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public can update alumni screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete alumni screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Service can manage alumni screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Service can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Public can view certificates" ON storage.objects;
DROP POLICY IF EXISTS "Service can update certificates" ON storage.objects;
DROP POLICY IF EXISTS "Service can delete certificates" ON storage.objects;
```

**Risks of Disabling RLS:**
❌ Anyone can upload malware to your buckets
❌ Students can delete admin's manual entry PDFs
❌ No control over who uploads what
❌ Storage can be abused (fill quota with junk files)
❌ Compliance issues (no audit trail)

---

## 🎯 Solution 3: Simplify RLS (Middle Ground)

Keep security but make it simpler:

```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Service can upload to no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view no-dues-files" ON storage.objects;
-- ... drop all policies

-- Create ONE policy per bucket: Allow service_role to do EVERYTHING
CREATE POLICY "Service role has full access to no-dues-files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'no-dues-files')
WITH CHECK (bucket_id = 'no-dues-files');

CREATE POLICY "Public can view no-dues-files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'no-dues-files');

-- Same for other buckets
CREATE POLICY "Service role has full access to alumni-screenshots"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'alumni-screenshots')
WITH CHECK (bucket_id = 'alumni-screenshots');

CREATE POLICY "Public can upload and view alumni-screenshots"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'alumni-screenshots')
WITH CHECK (bucket_id = 'alumni-screenshots');

CREATE POLICY "Service role has full access to certificates"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'certificates')
WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Public can view certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');
```

**This gives you:**
✅ Service role (admin) can do anything
✅ Public can upload to alumni-screenshots (student forms)
✅ Public can view all files
✅ Only service role can upload to no-dues-files and certificates
✅ Much simpler than current 15 policies

---

## My Recommendation

**Use Solution 1 (Upload API Route)** because:

1. ✅ **Security:** Service role key never exposed to frontend
2. ✅ **Flexibility:** You can add validation, file type checks, size limits
3. ✅ **Audit Trail:** Server logs every upload
4. ✅ **Future-proof:** Works with any RLS policy changes

**Implementation Time:** 10 minutes

**Code to add:** 1 API route (~50 lines) + update upload function in frontend (~10 lines)

---

## Quick Fix RIGHT NOW

If you need manual entry uploads to work **immediately** while you implement Solution 1:

```sql
-- TEMPORARY: Allow authenticated users to upload to no-dues-files
CREATE POLICY "Temp: Allow uploads to no-dues-files"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'no-dues-files');
```

This lets your manual entry page upload files while you build the proper API route.

**After implementing Solution 1, drop this policy:**
```sql
DROP POLICY "Temp: Allow uploads to no-dues-files" ON storage.objects;
```

---

## Summary

**Current Issue:** Manual entry uploads fail because code uses `supabase` client (has RLS) instead of `supabaseAdmin` (bypasses RLS).

**Best Fix:** Create `/api/upload` route that uses `supabaseAdmin` for all file uploads.

**Quick Fix:** Run the SQL above to temporarily allow uploads, then build proper API route.

**DON'T:** Disable RLS completely - that's a security nightmare.

Let me know which solution you want and I'll implement it for you!