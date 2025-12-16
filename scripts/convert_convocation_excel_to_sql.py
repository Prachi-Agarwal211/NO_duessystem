#!/usr/bin/env python3
"""
Convocation Excel to SQL Converter
Converts Passout_batch.xlsx to SQL INSERT statements
"""

import pandas as pd
import sys
from pathlib import Path

def clean_text(text):
    """Clean and escape text for SQL"""
    if pd.isna(text):
        return ''
    return str(text).replace("'", "''").strip()

def convert_excel_to_sql(excel_path, output_path=None):
    """Convert Excel file to SQL INSERT statements"""
    
    print(f"📖 Reading Excel file: {excel_path}")
    
    try:
        # Read Excel file
        df = pd.read_excel(excel_path)
        
        print(f"✅ Found {len(df)} rows")
        print(f"📋 Columns: {', '.join(df.columns)}")
        
        # Expected column mapping (flexible)
        column_map = {}
        for col in df.columns:
            col_lower = col.lower().strip()
            if 'reg' in col_lower or 'roll' in col_lower or 'id' in col_lower:
                column_map['registration_no'] = col
            elif 'name' in col_lower and 'student' in col_lower:
                column_map['student_name'] = col
            elif 'name' in col_lower:
                column_map['student_name'] = col
            elif 'school' in col_lower or 'department' in col_lower:
                column_map['school'] = col
            elif 'year' in col_lower or 'admission' in col_lower:
                column_map['admission_year'] = col
        
        print(f"\n🔍 Detected column mapping:")
        for key, val in column_map.items():
            print(f"   {key} → {val}")
        
        if len(column_map) < 4:
            print("\n⚠️  WARNING: Could not detect all required columns!")
            print("   Required: registration_no, student_name, school, admission_year")
            print("\n   Please manually map your columns in the script.")
            return
        
        # Generate SQL
        sql_lines = []
        sql_lines.append("-- ============================================================================")
        sql_lines.append("-- CONVOCATION STUDENT LIST IMPORT")
        sql_lines.append(f"-- Generated from: {Path(excel_path).name}")
        sql_lines.append(f"-- Total Students: {len(df)}")
        sql_lines.append("-- ============================================================================\n")
        
        sql_lines.append("-- Insert convocation eligible students")
        sql_lines.append("INSERT INTO public.convocation_eligible_students (")
        sql_lines.append("    registration_no,")
        sql_lines.append("    student_name,")
        sql_lines.append("    school,")
        sql_lines.append("    admission_year,")
        sql_lines.append("    status")
        sql_lines.append(") VALUES")
        
        values = []
        skipped = 0
        
        for idx, row in df.iterrows():
            try:
                reg_no = clean_text(row[column_map['registration_no']])
                name = clean_text(row[column_map['student_name']])
                school = clean_text(row[column_map['school']])
                year = clean_text(row[column_map['admission_year']])
                
                # Skip empty rows
                if not reg_no or not name:
                    skipped += 1
                    continue
                
                # Extract year if it's in a date format
                if len(year) > 4:
                    year = year[:4]
                
                value = f"    ('{reg_no}', '{name}', '{school}', '{year}', 'not_started')"
                values.append(value)
                
            except Exception as e:
                print(f"⚠️  Error processing row {idx + 2}: {e}")
                skipped += 1
                continue
        
        sql_lines.append(",\n".join(values))
        sql_lines.append("\nON CONFLICT (registration_no) DO NOTHING;")
        
        sql_lines.append("\n\n-- ============================================================================")
        sql_lines.append("-- VERIFICATION QUERIES")
        sql_lines.append("-- ============================================================================\n")
        
        sql_lines.append("-- Check total count")
        sql_lines.append("SELECT COUNT(*) as total_students")
        sql_lines.append("FROM public.convocation_eligible_students;\n")
        
        sql_lines.append("-- Check by school")
        sql_lines.append("SELECT school, COUNT(*) as count")
        sql_lines.append("FROM public.convocation_eligible_students")
        sql_lines.append("GROUP BY school")
        sql_lines.append("ORDER BY school;\n")
        
        sql_lines.append("-- Check by admission year")
        sql_lines.append("SELECT admission_year, COUNT(*) as count")
        sql_lines.append("FROM public.convocation_eligible_students")
        sql_lines.append("GROUP BY admission_year")
        sql_lines.append("ORDER BY admission_year DESC;\n")
        
        # Write to file
        sql_content = "\n".join(sql_lines)
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(sql_content)
            print(f"\n✅ SQL file created: {output_path}")
        else:
            print("\n" + "="*80)
            print(sql_content)
            print("="*80)
        
        print(f"\n📊 Summary:")
        print(f"   - Total rows processed: {len(df)}")
        print(f"   - Valid students: {len(values)}")
        print(f"   - Skipped rows: {skipped}")
        
        if output_path:
            print(f"\n🚀 Next steps:")
            print(f"   1. Review the generated file: {output_path}")
            print(f"   2. Copy the SQL content")
            print(f"   3. Run it in Supabase SQL Editor")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Default paths
    excel_file = "data/Passout_batch.xlsx"
    output_file = "IMPORT_CONVOCATION_STUDENTS.sql"
    
    # Check if file exists
    if not Path(excel_file).exists():
        print(f"❌ Error: Excel file not found: {excel_file}")
        print(f"   Please ensure the file exists at: {Path(excel_file).absolute()}")
        sys.exit(1)
    
    # Convert
    convert_excel_to_sql(excel_file, output_file)