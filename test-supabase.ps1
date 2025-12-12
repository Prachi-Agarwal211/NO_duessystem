# PowerShell Script to Test Supabase Keys
# Run this with: .\test-supabase.ps1

$SUPABASE_URL = "https://jfqlpyrgkvzbmolvaycz.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing Supabase Keys from .env.local" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Anon Key - Duplicate Check (Same as "Check" button)
Write-Host "Test 1: Testing Anon Key (Duplicate Check Query)..." -ForegroundColor Yellow
Write-Host "URL: $SUPABASE_URL/rest/v1/no_dues_forms" -ForegroundColor Gray
Write-Host "Registration: 20BMLTN001, Year: 2024-25`n" -ForegroundColor Gray

try {
    $headers = @{
        "apikey" = $ANON_KEY
        "Authorization" = "Bearer $ANON_KEY"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/no_dues_forms?select=id,registration_number,student_name&registration_number=eq.20BMLTN001&academic_year=eq.2024-25" -Headers $headers -Method GET
    
    Write-Host "✅ SUCCESS! Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Anon Key - Get One Form
Write-Host "`nTest 2: Testing Anon Key (Get Any Form)..." -ForegroundColor Yellow
Write-Host "URL: $SUPABASE_URL/rest/v1/no_dues_forms?limit=1`n" -ForegroundColor Gray

try {
    $headers = @{
        "apikey" = $ANON_KEY
        "Authorization" = "Bearer $ANON_KEY"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/no_dues_forms?select=id,registration_number,student_name&limit=1" -Headers $headers -Method GET
    
    Write-Host "✅ SUCCESS! Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Service Role Key (Should ALWAYS work)
Write-Host "`nTest 3: Testing Service Role Key (Admin Access)..." -ForegroundColor Yellow
Write-Host "URL: $SUPABASE_URL/rest/v1/no_dues_forms?limit=1`n" -ForegroundColor Gray

try {
    $headers = @{
        "apikey" = $SERVICE_KEY
        "Authorization" = "Bearer $SERVICE_KEY"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/no_dues_forms?select=id,registration_number,student_name&limit=1" -Headers $headers -Method GET
    
    Write-Host "✅ SUCCESS! Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Convocation Table Access (Anon Key)
Write-Host "`nTest 4: Testing Convocation Table Access (Anon Key)..." -ForegroundColor Yellow
Write-Host "URL: $SUPABASE_URL/rest/v1/convocation_eligible_students`n" -ForegroundColor Gray

try {
    $headers = @{
        "apikey" = $ANON_KEY
        "Authorization" = "Bearer $ANON_KEY"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/convocation_eligible_students?select=*&registration_number=eq.20BMLTN001" -Headers $headers -Method GET
    
    Write-Host "✅ SUCCESS! Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "If Test 1 & 2 FAILED with 406: Anon key issue" -ForegroundColor Yellow
Write-Host "If Test 3 PASSED but Test 1 & 2 FAILED: RLS blocking anonymous access" -ForegroundColor Yellow
Write-Host "If ALL PASSED: Keys are correct, issue is in Vercel Production" -ForegroundColor Yellow
Write-Host "`nNext Step: Compare these keys with Vercel Production environment variables" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan