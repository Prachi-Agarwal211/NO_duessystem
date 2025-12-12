# Test Supabase Keys with curl

## Your Current Keys from .env.local

```
SUPABASE_URL=https://jfqlpyrgkvzbmolvaycz.supabase.co
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs
```

---

## Test 1: Verify Anon Key Works (Duplicate Check Query)

This tests the exact query that the "Check" button uses:

```powershell
curl -X GET "https://jfqlpyrgkvzbmolvaycz.supabase.co/rest/v1/no_dues_forms?select=id&registration_number=eq.21JEXXXX01&academic_year=eq.2024-25" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls" -H "Content-Type: application/json"
```

**Expected Response:**
- ✅ `[]` (empty array) - No duplicate found
- ✅ `[{"id": "..."}]` - Duplicate exists
- ❌ `406 Not Acceptable` - Anon key issue or RLS blocking

---

## Test 2: Test with a Real Registration Number

Replace with an actual registration number from your database:

```powershell
curl -X GET "https://jfqlpyrgkvzbmolvaycz.supabase.co/rest/v1/no_dues_forms?select=id,registration_number,student_name&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls"
```

**Expected:** Should return one form record

---

## Test 3: Verify RLS Policies (Service Role)

Test with service role to confirm RLS is working:

```powershell
curl -X GET "https://jfqlpyrgkvzbmolvaycz.supabase.co/rest/v1/no_dues_forms?select=id&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs"
```

**Expected:** Should always return data (service role bypasses RLS)

---

## Test 4: Test Production Vercel API Directly

Test if the production API can access Supabase:

```powershell
curl -X POST "https://no-duessystem.vercel.app/api/student" -H "Content-Type: application/json" -d "{\"registration_number\":\"TEST123\",\"student_name\":\"Test Student\",\"email\":\"test@example.com\",\"mobile_number\":\"9876543210\",\"school_id\":\"valid-uuid-here\",\"course_id\":\"valid-uuid-here\",\"branch_id\":\"valid-uuid-here\",\"academic_year\":\"2024-25\",\"graduation_date\":\"2025-06-01\"}"
```

---

## Test 5: Verify Convocation Table Access (Anon Key)

Test the convocation eligibility check:

```powershell
curl -X GET "https://jfqlpyrgkvzbmolvaycz.supabase.co/rest/v1/convocation_eligible_students?select=*&registration_number=eq.21JE0001" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls"
```

---

## Test 6: Check API Health with Verbose Output

Get detailed error information:

```powershell
curl -v -X GET "https://jfqlpyrgkvzbmolvaycz.supabase.co/rest/v1/no_dues_forms?select=id&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls"
```

This will show:
- HTTP status code
- Response headers
- Any error messages

---

## Interpreting Results

### ✅ Success Indicators:
- HTTP 200 status
- JSON response with data or empty array `[]`
- No error messages

### ❌ Error Indicators:

**406 Not Acceptable:**
- Invalid API key format
- Key doesn't match Supabase project
- Key expired or regenerated

**401 Unauthorized:**
- Missing Authorization header
- Invalid JWT token

**403 Forbidden:**
- RLS policy blocking access
- User doesn't have permission

**404 Not Found:**
- Wrong Supabase URL
- Table doesn't exist

---

## Diagnosis Steps

### If Test 1 Returns 406:
1. The anon key in `.env.local` doesn't match Vercel Production
2. Go to Vercel Dashboard → no-duessystem → Settings → Environment Variables
3. Check if `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
4. Compare with `.env.local` - they must be IDENTICAL

### If Test 1 Works but Production Fails:
1. Environment variable not set in Vercel Production
2. Add the key from `.env.local` to Vercel
3. Redeploy

### If Test 3 Works but Test 1 Fails:
1. RLS policy blocking anonymous access
2. Run the SQL from `CHECK_AND_FIX_RLS.sql`

---

## Quick Fix Commands

### For PowerShell:
```powershell
# Set variables for easy testing
$SUPABASE_URL = "https://jfqlpyrgkvzbmolvaycz.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls"

# Test anon access
curl -X GET "$SUPABASE_URL/rest/v1/no_dues_forms?select=id&limit=1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```

---

## What to Check in Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click on your project: `no-duessystem`
3. Go to **Settings** → **Environment Variables**
4. Verify these exist for **Production**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://jfqlpyrgkvzbmolvaycz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (the anon key from above)
   - `SUPABASE_SERVICE_ROLE_KEY` = (the service role key from above)

5. If missing or different, update them
6. Click **Redeploy** on the latest deployment

---

## Expected Outcome

After running Test 1, you should see:
```json
[]
```

If you see a 406 error, the anon key in Vercel Production doesn't match your local `.env.local` file.