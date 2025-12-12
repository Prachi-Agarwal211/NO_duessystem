# Detailed Supabase API Test with Error Details
# Run this with: .\test-supabase-detailed.ps1

$SUPABASE_URL = "https://jfqlpyrgkvzbmolvaycz.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Detailed Supabase API Diagnostics" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Simple GET with full error details
Write-Host "Test 1: Simple GET request with error details..." -ForegroundColor Yellow
$uri = "$SUPABASE_URL/rest/v1/no_dues_forms?select=id&limit=1"
Write-Host "URI: $uri`n" -ForegroundColor Gray

try {
    $headers = @{
        "apikey" = $ANON_KEY
        "Authorization" = "Bearer $ANON_KEY"
    }
    
    $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method GET -ErrorAction Stop
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host "❌ FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    
    # Try to read the error response body
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Error Response Body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor White
    } catch {
        Write-Host "Could not read error response body" -ForegroundColor Red
    }
    
    Write-Host "Full Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Test Supabase Health
Write-Host "`nTest 2: Testing Supabase Project Health..." -ForegroundColor Yellow
$healthUri = "$SUPABASE_URL/rest/v1/"
Write-Host "URI: $healthUri`n" -ForegroundColor Gray

try {
    $headers = @{
        "apikey" = $ANON_KEY
    }
    
    $response = Invoke-RestMethod -Uri $healthUri -Headers $headers -Method GET -ErrorAction Stop
    
    Write-Host "✅ Supabase is reachable!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Cannot reach Supabase!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 3: List available tables
Write-Host "`nTest 3: Checking if we can access REST API..." -ForegroundColor Yellow
$tablesUri = "$SUPABASE_URL/rest/v1/"
Write-Host "URI: $tablesUri`n" -ForegroundColor Gray

try {
    $headers = @{
        "apikey" = $ANON_KEY
        "Authorization" = "Bearer $ANON_KEY"
        "Accept" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri $tablesUri -Headers $headers -Method GET -ErrorAction Stop
    
    Write-Host "✅ REST API is accessible!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Headers:" -ForegroundColor Gray
    $response.Headers | Format-Table -AutoSize
    Write-Host ""
} catch {
    Write-Host "❌ REST API Error!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Response:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor White
    } catch {}
    Write-Host ""
}

# Test 4: Check if table exists using OPTIONS
Write-Host "`nTest 4: Checking no_dues_forms table..." -ForegroundColor Yellow
$optionsUri = "$SUPABASE_URL/rest/v1/no_dues_forms"
Write-Host "URI: $optionsUri`n" -ForegroundColor Gray

try {
    $headers = @{
        "apikey" = $ANON_KEY
        "Authorization" = "Bearer $ANON_KEY"
    }
    
    $response = Invoke-WebRequest -Uri $optionsUri -Headers $headers -Method OPTIONS -ErrorAction Stop
    
    Write-Host "✅ Table exists and is accessible!" -ForegroundColor Green
    Write-Host "Allowed Methods: $($response.Headers['Access-Control-Allow-Methods'])" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Table check failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Diagnosis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Check the error responses above for details." -ForegroundColor Yellow
Write-Host "`nPossible Issues:" -ForegroundColor Yellow
Write-Host "1. Supabase project paused or suspended" -ForegroundColor White
Write-Host "2. PostgREST API disabled" -ForegroundColor White
Write-Host "3. Table doesn't exist or is in wrong schema" -ForegroundColor White
Write-Host "4. Network/firewall blocking requests" -ForegroundColor White
Write-Host "5. API keys regenerated in Supabase Dashboard" -ForegroundColor White
Write-Host "`n========================================`n" -ForegroundColor Cyan