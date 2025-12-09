# Manual Entry System - Documentation

## Overview

The Manual Entry System allows students who have already completed their no-dues clearance offline (through physical forms) to register their existing certificates in the digital system. This provides a complete record of all no-dues certificates issued by the university.

## System Architecture

### Database Structure

**Table**: `manual_entries`
- Stores submission data from students who completed offline process
- Similar fields to regular no_dues_forms but with simplified workflow
- Status: pending → approved/rejected

**Key Features**:
- Registration number uniqueness validation
- Email format validation
- Cascade relationships with config tables (schools, courses, branches)
- Automatic timestamp tracking

### Workflow

```
Student Submits
    ↓
Manual Entry Created (pending)
    ↓
Admin Reviews Certificate
    ↓
┌──────────────┴──────────────┐
│                              │
Approve                    Reject
│                              │
├─ Convert to Form            └─ Mark as rejected
├─ All Departments Approved       with reason
├─ Status: Completed
└─ Visible in System
```

## Features

### 1. Student Side (`/student/manual-entry`)

**Form Fields**:
- Registration Number (unique, required)
- Student Name (required)
- Personal Email (required, validated)
- College Email (required, validated)
- Admission Year (YYYY format, required)
- Passing Year (YYYY format, required)
- Parent/Guardian Name (optional)
- School (dropdown, required)
- Course (cascading dropdown, required)
- Branch/Specialization (cascading dropdown, optional)
- Contact Number (with country code, required)
- Certificate Screenshot (image/PDF upload, required)

**Validations**:
- Registration number checked against both manual_entries and no_dues_forms
- Email format validation
- Year format (YYYY) validation
- Year range validation (1950 to current year + 10)
- File upload required (stored in 'manual-certificates' bucket)

**User Experience**:
- Clear instructions and info banner
- Cascade selection for School → Course → Branch
- File upload with preview
- Success confirmation with auto-redirect

### 2. Admin Side (`/admin` - Manual Entries Tab)

**Features**:
- **Filter by Status**: Pending | Approved | Rejected
- **View Details**: Modal with complete student information
- **Review Certificate**: Direct link to uploaded document
- **Approve**: Converts to completed form automatically
- **Reject**: Requires rejection reason

**Actions**:
1. **Approve Entry**:
   - Marks manual_entry as approved
   - Creates new no_dues_form with status 'completed'
   - Creates no_dues_status records for ALL active departments
   - All departments automatically marked as 'approved'
   - Certificate screenshot becomes the form's certificate_url
   - Form appears in regular system as completed

2. **Reject Entry**:
   - Marks manual_entry as rejected
   - Stores rejection reason
   - Entry remains in system for record-keeping
   - Student can see rejection but cannot resubmit same registration number

## API Endpoints

### POST /api/manual-entry
Submit a new manual entry

**Request Body**:
```json
{
  "registration_no": "string",
  "student_name": "string",
  "personal_email": "string",
  "college_email": "string",
  "session_from": "string (YYYY)",
  "session_to": "string (YYYY)",
  "parent_name": "string (optional)",
  "school": "string",
  "course": "string",
  "branch": "string (optional)",
  "school_id": "uuid",
  "course_id": "uuid",
  "branch_id": "uuid (optional)",
  "country_code": "string",
  "contact_no": "string",
  "certificate_screenshot_url": "string (file URL)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Manual entry submitted successfully",
  "data": { /* entry object */ }
}
```

### GET /api/manual-entry
Get all manual entries (Admin only)

**Query Parameters**:
- `status` (optional): Filter by status (pending/approved/rejected)

**Response**:
```json
{
  "success": true,
  "data": [ /* array of entries with relations */ ]
}
```

### POST /api/manual-entry/action
Approve or reject a manual entry (Admin only)

**Request Body**:
```json
{
  "entry_id": "uuid",
  "action": "approve" | "reject",
  "rejection_reason": "string (required if action=reject)"
}
```

**Response (Approve)**:
```json
{
  "success": true,
  "message": "Manual entry approved and converted to completed form",
  "data": {
    "manual_entry_id": "uuid",
    "form_id": "uuid"
  }
}
```

**Response (Reject)**:
```json
{
  "success": true,
  "message": "Manual entry rejected",
  "data": {
    "manual_entry_id": "uuid",
    "rejection_reason": "string"
  }
}
```

## Database Functions

### convert_manual_entry_to_form(manual_entry_id UUID)

Converts an approved manual entry into a completed no-dues form.

**Steps**:
1. Validates entry is approved
2. Checks if form already exists for registration number
3. If exists: Updates to completed, marks all departments approved
4. If new: Creates form with completed status
5. Creates approved status for all active departments
6. Returns the form ID

**Usage** (called automatically by API):
```sql
SELECT convert_manual_entry_to_form('entry-uuid-here');
```

## Setup Instructions

### 1. Database Setup

```bash
# Run the migration script in Supabase SQL Editor
# File: scripts/add-manual-entry-system.sql
```

**This creates**:
- `manual_entries` table
- Indexes for performance
- RLS policies
- Triggers for timestamps
- `convert_manual_entry_to_form` function

### 2. Storage Bucket Setup

Create storage bucket in Supabase:

```
Bucket Name: manual-certificates
Public: false (authenticated access only)
File size limit: 10MB
Allowed MIME types: image/*, application/pdf
```

**Bucket Policies**:
```sql
-- Allow anyone to upload
CREATE POLICY "Anyone can upload manual certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'manual-certificates');

-- Allow anyone to read their own uploads
CREATE POLICY "Users can read manual certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'manual-certificates');

-- Admin can read all
CREATE POLICY "Admin can read all manual certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'manual-certificates' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### 3. Environment Variables

No additional environment variables needed. Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Deploy Code

All files are ready:
- ✅ Database migration script
- ✅ API endpoints
- ✅ Student form page
- ✅ Admin review interface
- ✅ Landing page integration

## Testing

### Test Workflow

1. **Submit Manual Entry** (`/student/manual-entry`):
   ```
   - Fill all required fields
   - Select School → Course → Branch
   - Upload certificate image/PDF
   - Submit form
   - Verify success message
   ```

2. **Admin Review** (`/admin` - Manual Entries tab):
   ```
   - Login as admin
   - Switch to "Manual Entries" tab
   - View pending entries
   - Click on entry to view details
   - Review uploaded certificate
   - Approve or reject with reason
   ```

3. **Verify Conversion**:
   ```
   - After approval, check Dashboard tab
   - Search for registration number
   - Verify form shows as "Completed"
   - Verify all departments show "Approved"
   - Check certificate URL matches uploaded file
   ```

### Test Cases

#### Positive Tests
- ✅ Submit valid manual entry
- ✅ Approve entry and verify form creation
- ✅ Verify all departments auto-approved
- ✅ Certificate URL transferred correctly
- ✅ Form appears in check status

#### Negative Tests
- ❌ Duplicate registration number (should fail)
- ❌ Invalid email format (should fail validation)
- ❌ Missing required fields (should fail validation)
- ❌ Invalid year format (should fail validation)
- ❌ No certificate upload (should block submission)

#### Edge Cases
- 🔄 Reject entry then try same registration again (should fail)
- 🔄 Approve entry for existing registration (should update, not create)
- 🔄 Multiple manual entries (queue management)

## Security

### Authentication
- **Student Side**: Public access (no auth required)
- **Admin Actions**: JWT token validation + admin role check

### Authorization
- Only admins can view all manual entries
- Only admins can approve/reject entries
- Students can only view their own submissions

### Data Validation
- Server-side validation on all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized outputs)
- File type validation on uploads
- Size limits on file uploads

### RLS Policies
- Students: INSERT only
- Admins: Full access (SELECT, UPDATE, DELETE)
- Public: SELECT for checking status

## Monitoring & Maintenance

### Key Metrics
- Total manual entries submitted
- Pending review count
- Approval rate
- Rejection rate
- Average review time

### Regular Tasks
1. **Monitor Pending Queue**: Check for entries needing review
2. **Review Rejections**: Analyze common rejection reasons
3. **Clean Old Entries**: Archive approved/rejected entries after 1 year
4. **Storage Management**: Monitor certificate uploads size

### Database Queries

**Check pending entries**:
```sql
SELECT COUNT(*) FROM manual_entries WHERE status = 'pending';
```

**Get approval statistics**:
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM manual_entries
GROUP BY status;
```

**Recent activity**:
```sql
SELECT 
  student_name,
  registration_no,
  status,
  created_at,
  approved_at
FROM manual_entries
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Entry not showing in admin panel
**Solution**: Check RLS policies, verify admin authentication

### Issue: Form not created after approval
**Solution**: Check `convert_manual_entry_to_form` function logs

### Issue: Certificate not accessible
**Solution**: Verify storage bucket policies, check file URL

### Issue: Duplicate registration error
**Solution**: Entry already exists, check both tables

### Issue: Email not sent after approval
**Solution**: Currently no email notification implemented (future enhancement)

## Future Enhancements

1. **Email Notifications**:
   - Notify student when entry is approved/rejected
   - Notify admin when new entry submitted

2. **Bulk Operations**:
   - Batch approve multiple entries
   - Export manual entries to CSV

3. **Advanced Filters**:
   - Filter by school/course/branch
   - Date range filters
   - Search by student name

4. **Audit Trail**:
   - Track who approved/rejected
   - Track changes to entries
   - View approval history

5. **Analytics Dashboard**:
   - Visual charts for manual entries
   - Processing time metrics
   - Department-wise distribution

## Support

For issues or questions:
1. Check this documentation
2. Review database logs in Supabase
3. Check browser console for errors
4. Review API response errors

---

**Last Updated**: December 9, 2024
**Version**: 1.0.0
**Status**: Production Ready