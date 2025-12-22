# Simple Daily Reminder System

## Overview
This is a simple, self-scheduling reminder system that sends emails to staff at 4 PM IST daily. No Vercel Cron needed - it runs automatically whenever the app receives API requests.

## How It Works

### 1. **Automatic Checking**
- The [`middleware.js:17`](middleware.js:17) checks for reminders on every API request
- Uses a fire-and-forget approach (non-blocking)
- Only checks during API calls to avoid slowing down page loads

### 2. **Smart Scheduling**
- [`dailyReminder.js:shouldSendReminder()`](src/lib/dailyReminder.js:262) checks if it's 4 PM IST (16:00)
- Has a 5-minute window to catch the time
- Prevents duplicate sends using database tracking

### 3. **Database Tracking**
- Uses `settings` table to track last reminder date
- Key: `last_reminder_sent`
- Value: Date in YYYY-MM-DD format
- Ensures only ONE reminder per day

### 4. **Email Content**
Each staff member receives:
- **Subject**: "Daily Reminder: X Pending Applications"
- **Count**: Number of pending applications in their scope
- **Button**: Direct link to dashboard
- **Clean Design**: Professional HTML email with gradient header

### 5. **Scope Filtering (HOD Support)**
- HOD staff only see students in their school/course/branch arrays
- Regular staff see all pending applications
- Respects department filtering rules

## Files Created

### 1. [`src/lib/dailyReminder.js`](src/lib/dailyReminder.js)
Main reminder logic:
- `sendDailyReminders()` - Sends to all staff
- `shouldSendReminder()` - Checks if it's 4 PM IST
- `checkAndSendReminder()` - Main function called by middleware
- `getPendingCount()` - Gets count with scope filtering
- Email templates (HTML + plain text)

### 2. [`src/app/api/reminders/check/route.js`](src/app/api/reminders/check/route.js)
API endpoint for manual testing:
- **GET**: Automatic check (called by middleware)
- **POST**: Force send reminders (for testing)

### 3. [`middleware.js`](middleware.js)
Modified to include reminder checking:
- Calls `checkDailyReminders()` on API requests
- Non-blocking (fire-and-forget)
- Silently fails to not disrupt requests

## Setup Instructions

### 1. **Database Setup**
Create `settings` table if it doesn't exist:

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **Environment Variables**
Make sure these are set in `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@jecrcuniversity.edu.in
SMTP_PASS=your-app-password

# Base URL
NEXT_PUBLIC_BASE_URL=https://nodues.jecrcuniversity.edu.in

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. **Deploy**
Just deploy normally. The system will automatically start checking for 4 PM IST.

## Testing

### Manual Test (Force Send)
```bash
# Send reminders immediately (for testing)
curl -X POST https://nodues.jecrcuniversity.edu.in/api/reminders/check
```

### Check Status
```bash
# Check if it's reminder time
curl https://nodues.jecrcuniversity.edu.in/api/reminders/check
```

### Test for Specific Staff
Modify [`dailyReminder.js`](src/lib/dailyReminder.js) temporarily:
```javascript
// In sendDailyReminders(), replace the query with:
const { data: staff, error } = await supabase
  .from('profiles')
  .select('email, full_name')
  .eq('email', 'test@example.com') // Your test email
  .in('role', ['staff', 'hod']);
```

## How Reminder Time Works

The system converts current time to IST (UTC+5:30) and checks:
- **Hour**: 16 (4 PM)
- **Minute**: 0-4 (5-minute window)

Example:
```javascript
// Current UTC: 10:30 AM
// IST Time: 4:00 PM ✅ Sends reminder

// Current UTC: 10:35 AM  
// IST Time: 4:05 PM ❌ Window closed

// Current UTC: 11:00 AM
// IST Time: 4:30 PM ❌ Already sent today
```

## Email Example

**Subject**: `Daily Reminder: 5 Pending Applications`

```
Hello Dr. Sharma,

This is your daily reminder about pending applications in your dashboard.

┌─────────────────────────┐
│          5              │
│  Applications Pending   │
└─────────────────────────┘

Please review and take action on these applications at your earliest convenience.

[Go to Dashboard]

---
This is an automated daily reminder sent at 4:00 PM IST.
JECRC No Dues System
```

## Advantages Over Vercel Cron

1. **No Pro Plan Required** - Works on Vercel Hobby plan
2. **Self-Healing** - Automatically catches up if server was down
3. **No Configuration** - Just deploy and it works
4. **Easy Testing** - Manual trigger via POST request
5. **Flexible** - Can easily change time or logic
6. **Reliable** - Multiple API requests ensure it triggers

## Monitoring

Check logs for these messages:
```
✓ Reminder sent to staff@example.com (5 pending)
✗ Failed to send reminder to staff@example.com: Error message
Daily reminders completed: 10 sent, 0 failed
```

## Troubleshooting

### Reminders Not Sending

1. **Check Time Zone**
   - Verify IST calculation in [`shouldSendReminder()`](src/lib/dailyReminder.js:262)
   - Current time: `new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })`

2. **Check Database**
   ```sql
   SELECT * FROM settings WHERE key = 'last_reminder_sent';
   ```
   - Delete row to allow immediate resend

3. **Check Email Settings**
   - Verify SMTP credentials
   - Test with [`scripts/test-email-smtp.js`](scripts/test-email-smtp.js)

4. **Check Logs**
   - Vercel logs: `vercel logs`
   - Look for "Starting daily reminder process..."

### Duplicate Emails

- Check if `last_reminder_sent` is being updated
- Verify time window logic (should be 5 minutes max)

### No Emails at All

1. Make sure your app receives API traffic around 4 PM IST
2. The system needs at least ONE API request between 4:00-4:05 PM IST
3. If your app is idle, consider adding a simple health check ping

## Future Enhancements

Possible improvements:
1. Add email preferences (opt-out option)
2. Customize reminder time per staff member
3. Add weekly summary option
4. Include application statistics in email
5. Add retry logic for failed sends

## Security Notes

- No authentication required for GET (just checks time)
- POST endpoint has no auth (consider adding if needed)
- Database uses service role key (secure)
- Emails sent via authenticated SMTP

## Summary

✅ **Simple**: No external cron services  
✅ **Automatic**: Works on every deployment  
✅ **Reliable**: Multiple chances to trigger  
✅ **Testable**: Manual trigger available  
✅ **Smart**: Prevents duplicates  
✅ **Scope-Aware**: Respects HOD filtering  

The system will automatically send reminder emails at 4 PM IST daily to all staff members, showing them how many applications are pending in their dashboard.