# Daily Reminder System Setup (FREE)

Since Vercel Cron requires a paid plan, we'll use **cron-job.org** (completely free) to trigger our daily reminders.

## How It Works

1. Our API route `/api/reminders/check` already exists and works
2. It checks if it's 4 PM IST and hasn't sent today's reminder
3. We just need something to call it daily at 4 PM IST

## Setup Instructions (5 minutes)

### Step 1: Create Free Cron-Job.org Account

1. Go to https://cron-job.org/en/signup.php
2. Sign up with email (FREE forever, no credit card needed)
3. Verify your email

### Step 2: Create the Cron Job

1. Login to cron-job.org
2. Click "Create cronjob" button
3. Fill in the form:

   **Title:** JECRC Daily Reminder
   
   **URL:** `https://nodues.jecrcuniversity.edu.in/api/reminders/check`
   
   **Schedule:**
   - Execution: Every day
   - Time: **10:30** (this is UTC time)
   - Timezone: UTC
   
   *(10:30 AM UTC = 4:00 PM IST)*
   
   **Request Method:** GET
   
   **Enable Job:** ✅ (checked)

4. Click "Create cronjob"

### Step 3: Test It

1. In cron-job.org dashboard, find your job
2. Click "Run now" button to test immediately
3. Check execution history - should show "Success (200)"

### Step 4: Verify Emails

After running manually:
1. Check if staff received reminder emails
2. Look in console for logs like:
   ```
   Starting daily reminder process...
   Found X staff members
   ✓ Reminder sent to email@example.com (5 pending)
   ```

## Alternative Free Cron Services

If cron-job.org doesn't work, try these FREE alternatives:

1. **EasyCron** - https://www.easycron.com/
   - Free plan: 1 cron job
   - Setup: Same as above

2. **cron.help** - https://cron.help/
   - Free tier available
   - Setup: Same as above

3. **UptimeRobot** - https://uptimerobot.com/
   - Free monitor every 5 minutes
   - Use HTTP(s) monitoring on your reminder URL
   - Set check interval: Every day at specific time

## How the System Works

### When Cron Job Calls the API:

1. **Request arrives:** `GET /api/reminders/check`

2. **Time Check:** 
   ```javascript
   // Checks if it's 4 PM IST (16:00 - 16:05 window)
   shouldSendReminder() // Returns true/false
   ```

3. **Already Sent Check:**
   ```javascript
   // Checks database: Did we send today already?
   settings.last_reminder_sent === today // Skip if yes
   ```

4. **Send Reminders:**
   ```javascript
   // Gets all staff members
   // For each: Count pending applications
   // Send personalized email with count
   ```

5. **Update Database:**
   ```javascript
   // Mark today as sent
   settings.last_reminder_sent = today
   ```

## Troubleshooting

### Reminders Not Sending?

1. **Check Cron Job Status:**
   - Login to cron-job.org
   - View execution history
   - Should show 200 status

2. **Check API Logs:**
   ```bash
   # Vercel Dashboard → Your Project → Logs
   # Look for: "Starting daily reminder process..."
   ```

3. **Test Manually:**
   ```bash
   curl https://nodues.jecrcuniversity.edu.in/api/reminders/check
   ```

4. **Check SMTP Settings:**
   - Verify `.env` has correct SMTP credentials
   - Test with: `npm run test-email` (if script exists)

### Wrong Time Zone?

If emails arrive at wrong time:
- Remember: Cron-job.org uses UTC time
- 4:00 PM IST = 10:30 AM UTC
- Adjust cron schedule accordingly

## Email Mode Toggle

Remember: Daily reminders ONLY work when admin sets email mode to "Daily Digest"

**To Check/Change Mode:**
1. Login as admin
2. Go to Settings
3. Email Notification Mode:
   - **Immediate** = Send email when student applies
   - **Daily Digest** = Send daily reminder at 4 PM

Both modes work independently:
- Immediate: Uses existing email service
- Daily Digest: Uses this cron system

## Cost

- **cron-job.org:** FREE forever ✅
- **Vercel Hosting:** FREE (Hobby plan) ✅
- **Database (Supabase):** FREE tier ✅
- **Total Cost:** $0/month ✅

## Benefits Over Vercel Cron

1. ✅ **Completely FREE** (no upgrade needed)
2. ✅ **More reliable** (dedicated cron service)
3. ✅ **Easy monitoring** (dashboard shows all executions)
4. ✅ **Email alerts** (cron-job.org can email you if job fails)
5. ✅ **Detailed logs** (see exact execution times and responses)

## Security Note

The `/api/reminders/check` endpoint is public but safe because:
- It only runs if it's 4 PM IST window
- It only runs once per day (checks database)
- It doesn't expose any sensitive data
- It doesn't accept user input

## Summary

**Setup Time:** 5 minutes
**Cost:** $0
**Maintenance:** None (set and forget)

Once configured, the system will:
- Run automatically every day at 4 PM IST
- Send reminder emails to all staff
- Track pending applications per staff
- Log all executions for monitoring

No code changes needed - the API is already built and working!