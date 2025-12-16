#!/usr/bin/env python3
"""
Convert fetch_cleaned.csv to SQL INSERT statements for convocation students
"""

import csv
from pathlib import Path

def clean_text(text):
    """Clean and escape text for SQL"""
    if not text:
        return ''
    return str(text).replace("'", "''").strip()

def convert_csv_to_sql():
    """Convert CSV to SQL INSERT statements"""
    
    csv_file = "fetch_cleaned.csv"
    output_file = "IMPORT_CONVOCATION_STUDENTS.sql"
    
    print(f"Reading CSV file: {csv_file}")
    
    if not Path(csv_file).exists():
        print(f"ERROR: CSV file not found: {csv_file}")
        return
    
    try:
        sql_lines = []
        values = []
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            print(f"Columns found: {', '.join(csv_reader.fieldnames)}")
            
            for idx, row in enumerate(csv_reader, start=1):
                school = clean_text(row['school'])
                reg_no = clean_text(row['registration_no'])
                name = clean_text(row['student_name'])
                year = clean_text(row['admission_year'])
                
                # Skip empty rows
                if not reg_no or not name:
                    continue
                
                value = f"    ('{reg_no}', '{name}', '{school}', '{year}', 'not_started')"
                values.append(value)
        
        print(f"SUCCESS: Processed {len(values)} students")
        
        # Generate SQL header
        sql_lines.append("-- ============================================================================")
        sql_lines.append("-- 9TH CONVOCATION - STUDENT LIST IMPORT")
        sql_lines.append("-- ============================================================================")
        sql_lines.append(f"-- Total Students: {len(values)}")
        sql_lines.append("-- Source: fetch_cleaned.csv")
        sql_lines.append("-- ============================================================================\n")
        
        # Generate INSERT statement
        sql_lines.append("-- Insert convocation eligible students")
        sql_lines.append("INSERT INTO public.convocation_eligible_students (")
        sql_lines.append("    registration_no,")
        sql_lines.append("    student_name,")
        sql_lines.append("    school,")
        sql_lines.append("    admission_year,")
        sql_lines.append("    status")
        sql_lines.append(") VALUES")
        sql_lines.append(",\n".join(values))
        sql_lines.append("\nON CONFLICT (registration_no) DO UPDATE SET")
        sql_lines.append("    student_name = EXCLUDED.student_name,")
        sql_lines.append("    school = EXCLUDED.school,")
        sql_lines.append("    admission_year = EXCLUDED.admission_year;")
        
        # Add verification queries
        sql_lines.append("\n\n-- ============================================================================")
        sql_lines.append("-- VERIFICATION QUERIES")
        sql_lines.append("-- ============================================================================\n")
        
        sql_lines.append("-- 1. Check total count")
        sql_lines.append("SELECT COUNT(*) as total_students")
        sql_lines.append("FROM public.convocation_eligible_students;\n")
        
        sql_lines.append("-- 2. Check by school")
        sql_lines.append("SELECT")
        sql_lines.append("    school,")
        sql_lines.append("    COUNT(*) as student_count")
        sql_lines.append("FROM public.convocation_eligible_students")
        sql_lines.append("GROUP BY school")
        sql_lines.append("ORDER BY school;\n")
        
        sql_lines.append("-- 3. Check by admission year")
        sql_lines.append("SELECT")
        sql_lines.append("    admission_year,")
        sql_lines.append("    COUNT(*) as student_count")
        sql_lines.append("FROM public.convocation_eligible_students")
        sql_lines.append("GROUP BY admission_year")
        sql_lines.append("ORDER BY admission_year DESC;\n")
        
        sql_lines.append("-- 4. Check by status")
        sql_lines.append("SELECT")
        sql_lines.append("    status,")
        sql_lines.append("    COUNT(*) as count")
        sql_lines.append("FROM public.convocation_eligible_students")
        sql_lines.append("GROUP BY status;\n")
        
        sql_lines.append("-- 5. Sample data")
        sql_lines.append("SELECT * FROM public.convocation_eligible_students")
        sql_lines.append("LIMIT 10;")
        
        # Write to file
        sql_content = "\n".join(sql_lines)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        print(f"\nSUCCESS: SQL file created: {output_file}")
        print(f"\nSummary:")
        print(f"   - Total students: {len(values)}")
        print(f"\nNext steps:")
        print(f"   1. Open {output_file}")
        print(f"   2. Copy all the SQL content")
        print(f"   3. Go to Supabase Dashboard → SQL Editor")
        print(f"   4. Paste and run the SQL")
        print(f"   5. Run the verification queries to confirm import")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    convert_csv_to_sql()