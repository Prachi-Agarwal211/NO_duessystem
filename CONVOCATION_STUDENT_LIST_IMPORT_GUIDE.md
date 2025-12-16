# Convocation Student List Import Guide

## Overview

This guide will help you import the 9th Convocation eligible students from `data/Passout_batch.xlsx` into your database.

## Table Structure

The `convocation_eligible_students` table has the following columns:
- `id` (UUID) - Auto-generated
- `registration_no` (TEXT) - Student's registration number (UNIQUE)
- `student_name` (TEXT) - Student's full name
- `school` (TEXT) - School name
- `admission_year` (TEXT) - Year of admission
- `status` (TEXT) - One of: 'not_started', 'pending_online', 'pending_manual', 'completed_online', 'completed_manual'
- `form_id` (UUID) - Reference to no_dues_forms table (NULL initially)
- `created_at` (TIMESTAMPTZ) - Auto-generated
- `updated_at` (TIMESTAMPTZ) - Auto-generated

## Step 1: Convert Excel to CSV

### Option A: Using Excel
1. Open `data/Passout_batch.xlsx` in Microsoft Excel
2. Click **File → Save As**
3. Choose **CSV (Comma delimited) (*.csv)** format
4. Save as `data/convocation_students.csv`

### Option B: Using Google Sheets
1. Upload `Passout_batch.xlsx` to Google Drive
2. Open with Google Sheets
3. Click **File → Download → Comma Separated Values (.csv)**
4. Save as `data/convocation_students.csv`

## Step 2: Prepare CSV Format

Your CSV should have these columns (in this order):
```
registration_no,student_name,school,admission_year
```

**Example:**
```csv
registration_no,student_name,school,admission_year
21JRCS0001,John Doe,School of Engineering & Technology,2021
21JRCS0002,Jane Smith,School of Computer Applications,2021
```

### Important Notes:
- **Header Row**: First row must have column names
- **Registration Number**: Must be unique and match your student ID format
- **School Name**: Must exactly match one of your 13 schools:
  - School of Engineering & Technology
  - School of Computer Applications
  - Jaipur School of Business
  - School of Sciences
  - School of Humanities & Social Sciences
  - School of Law
  - Jaipur School of Mass Communication
  - Jaipur School of Design
  - Jaipur School of Economics
  - School of Allied Health Sciences
  - School of Hospitality
  - Directorate of Executive Education
  - Ph.D. (Doctoral Programme)
- **Admission Year**: Format as 4-digit year (e.g., 2021, 2022)

## Step 3: Import via Supabase Dashboard

### Method 1: Using Supabase Table Editor (Recommended for Small Files)

1. **Login to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Table Editor**
   - Click **Table Editor** in left sidebar
   - Find `convocation_eligible_students` table
   - Click on the table name

3. **Import CSV**
   - Click the **"Insert"** dropdown button
   - Select **"Import data via spreadsheet"**
   - Click **"Choose File"** and select your CSV
   - Map columns:
     - `registration_no` → `registration_no`
     - `student_name` → `student_name`
     - `school` → `school`
     - `admission_year` → `admission_year`
   - Click **"Import"**

### Method 2: Using SQL Query (Recommended for Large Files)

1. **Create Temporary Table**

Run this in Supabase SQL Editor:

```sql
-- Create temporary table for CSV import
CREATE TEMP TABLE temp_convocation_import (
    registration_no TEXT,
    student_name TEXT,
    school TEXT,
    admission_year TEXT
);
```

2. **Import CSV Data**

Unfortunately, Supabase doesn't support `COPY FROM` directly. You'll need to:

**Option A: Use SQL INSERT statements**

Convert your CSV to SQL INSERT statements. Here's a Python script to help:

```python
import csv

with open('data/convocation_students.csv', 'r', encoding='utf-8') as file:
    csv_reader = csv.DictReader(file)
    
    print("INSERT INTO public.convocation_eligible_students (registration_no, student_name, school, admission_year, status) VALUES")
    
    rows = []
    for row in csv_reader:
        reg_no = row['registration_no'].replace("'", "''")
        name = row['student_name'].replace("'", "''")
        school = row['school'].replace("'", "''")
        year = row['admission_year']
        
        rows.append(f"    ('{reg_no}', '{name}', '{school}', '{year}', 'not_started')")
    
    print(",\n".join(rows) + ";")
```

**Option B: Use Supabase JavaScript Client**

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY'
);

const students = [];

fs.createReadStream('data/convocation_students.csv')
  .pipe(csv())
  .on('data', (row) => {
    students.push({
      registration_no: row.registration_no,
      student_name: row.student_name,
      school: row.school,
      admission_year: row.admission_year,
      status: 'not_started'
    });
  })
  .on('end', async () => {
    // Insert in batches of 1000
    for (let i = 0; i < students.length; i += 1000) {
      const batch = students.slice(i, i + 1000);
      const { data, error } = await supabase
        .from('convocation_eligible_students')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i}:`, error);
      } else {
        console.log(`Inserted batch ${i} - ${i + batch.length}`);
      }
    }
    
    console.log('Import complete!');
  });
```

## Step 4: Verify Import

Run these verification queries in Supabase SQL Editor:

```sql
-- Check total count
SELECT COUNT(*) as total_students 
FROM public.convocation_eligible_students;

-- Check by school
SELECT 
    school,
    COUNT(*) as student_count,
    COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
    COUNT(*) FILTER (WHERE status LIKE 'pending%') as pending,
    COUNT(*) FILTER (WHERE status LIKE 'completed%') as completed
FROM public.convocation_eligible_students
GROUP BY school
ORDER BY school;

-- Check by admission year
SELECT 
    admission_year,
    COUNT(*) as student_count
FROM public.convocation_eligible_students
GROUP BY admission_year
ORDER BY admission_year DESC;

-- Check for duplicates (should return 0)
SELECT registration_no, COUNT(*) 
FROM public.convocation_eligible_students
GROUP BY registration_no
HAVING COUNT(*) > 1;

-- Sample data
SELECT * FROM public.convocation_eligible_students 
LIMIT 10;
```

## Step 5: Update Status Automatically

The system automatically updates the convocation status when:
- A student submits an online form → status becomes `pending_online`
- An admin creates a manual entry → status becomes `pending_manual`
- A form is completed → status becomes `completed_online` or `completed_manual`

This is handled by the `update_convocation_status()` trigger function.

## Troubleshooting

### Issue: "Duplicate key value violates unique constraint"
**Solution**: You're trying to import a student that already exists. Check for duplicates in your CSV or delete existing records first:
```sql
DELETE FROM public.convocation_eligible_students 
WHERE registration_no = 'DUPLICATE_REG_NO';
```

### Issue: "Invalid school name"
**Solution**: The school name in your CSV doesn't match the database. Run this to see valid school names:
```sql
SELECT name FROM public.config_schools ORDER BY display_order;
```

### Issue: Import takes too long
**Solution**: Use batch imports (1000 records at a time) via JavaScript client or split your CSV into smaller files.

### Issue: Special characters not displaying correctly
**Solution**: Ensure your CSV is UTF-8 encoded:
- In Excel: Save As → Tools → Web Options → Encoding → Unicode (UTF-8)
- In Notepad++: Encoding → Convert to UTF-8

## Clean Up (If Needed)

To delete all convocation data and start fresh:

```sql
-- ⚠️ WARNING: This deletes ALL convocation data
TRUNCATE TABLE public.convocation_eligible_students RESTART IDENTITY CASCADE;
```

## Post-Import Checklist

- [ ] Verify total student count matches your Excel file
- [ ] Check that all schools are represented correctly
- [ ] Verify no duplicate registration numbers
- [ ] Test the convocation check page at `/convocation`
- [ ] Test auto-fill functionality for registered students
- [ ] Verify status updates when forms are submitted

## Support

If you encounter issues:
1. Check the Supabase logs: Dashboard → Logs → Postgres Logs
2. Verify your CSV format matches the template
3. Ensure all school names are exact matches
4. Check for special characters or encoding issues in student names