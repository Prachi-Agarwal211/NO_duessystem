#!/usr/bin/env node

/**
 * Diagnostic Script: Form Validation Issues
 * 
 * This script checks why form submission is failing with "Invalid" errors
 * Run: node scripts/diagnose-form-validation.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 DIAGNOSING FORM VALIDATION ISSUES\n');
  console.log('=' .repeat(60));
  
  // Check 1: Table existence and row counts
  console.log('\n📊 CHECK 1: Database Tables and Row Counts\n');
  
  try {
    const { data: schools, error: schoolError } = await supabase
      .from('config_schools')
      .select('id, name, is_active')
      .order('display_order');
    
    if (schoolError) {
      console.error('❌ Error fetching schools:', schoolError.message);
    } else {
      const activeCount = schools.filter(s => s.is_active).length;
      console.log(`✅ config_schools: ${schools.length} total, ${activeCount} active`);
      
      if (activeCount === 0) {
        console.error('⚠️  WARNING: No active schools! This will cause "Invalid school selection" errors');
      } else if (activeCount < 13) {
        console.warn(`⚠️  WARNING: Expected 13 active schools, found ${activeCount}`);
      }
      
      // Show first 3 schools
      console.log('\n   Sample schools:');
      schools.slice(0, 3).forEach(s => {
        console.log(`   - ${s.name} (${s.id.substring(0, 8)}...) [${s.is_active ? 'ACTIVE' : 'INACTIVE'}]`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to check schools:', err.message);
  }
  
  try {
    const { data: courses, error: courseError } = await supabase
      .from('config_courses')
      .select('id, name, school_id, is_active')
      .order('display_order');
    
    if (courseError) {
      console.error('❌ Error fetching courses:', courseError.message);
    } else {
      const activeCount = courses.filter(c => c.is_active).length;
      console.log(`\n✅ config_courses: ${courses.length} total, ${activeCount} active`);
      
      if (activeCount === 0) {
        console.error('⚠️  WARNING: No active courses! This will cause "Invalid course selection" errors');
      } else if (activeCount < 28) {
        console.warn(`⚠️  WARNING: Expected 28 active courses, found ${activeCount}`);
      }
      
      // Show first 3 courses
      console.log('\n   Sample courses:');
      courses.slice(0, 3).forEach(c => {
        console.log(`   - ${c.name} (${c.id.substring(0, 8)}...) [${c.is_active ? 'ACTIVE' : 'INACTIVE'}]`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to check courses:', err.message);
  }
  
  try {
    const { data: branches, error: branchError } = await supabase
      .from('config_branches')
      .select('id, name, course_id, is_active')
      .order('display_order');
    
    if (branchError) {
      console.error('❌ Error fetching branches:', branchError.message);
    } else {
      const activeCount = branches.filter(b => b.is_active).length;
      console.log(`\n✅ config_branches: ${branches.length} total, ${activeCount} active`);
      
      if (activeCount === 0) {
        console.error('⚠️  WARNING: No active branches! This will cause "Invalid branch selection" errors');
      } else if (activeCount < 139) {
        console.warn(`⚠️  WARNING: Expected 139 active branches, found ${activeCount}`);
      }
      
      // Show first 3 branches
      console.log('\n   Sample branches:');
      branches.slice(0, 3).forEach(b => {
        console.log(`   - ${b.name} (${b.id.substring(0, 8)}...) [${b.is_active ? 'ACTIVE' : 'INACTIVE'}]`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to check branches:', err.message);
  }
  
  // Check 2: Foreign key integrity
  console.log('\n\n📎 CHECK 2: Foreign Key Relationships\n');
  
  try {
    const { data: orphanCourses, error: orphanError } = await supabase
      .from('config_courses')
      .select(`
        id,
        name,
        school_id,
        config_schools!inner(id, name)
      `)
      .eq('is_active', true)
      .is('config_schools.id', null);
    
    if (orphanError) {
      console.error('❌ Error checking orphan courses:', orphanError.message);
    } else if (orphanCourses && orphanCourses.length > 0) {
      console.error(`⚠️  WARNING: ${orphanCourses.length} courses have invalid school_id!`);
      orphanCourses.slice(0, 3).forEach(c => {
        console.error(`   - ${c.name} (school_id: ${c.school_id})`);
      });
    } else {
      console.log('✅ All courses have valid school references');
    }
  } catch (err) {
    console.error('❌ Failed to check course relationships:', err.message);
  }
  
  try {
    const { data: orphanBranches, error: orphanError } = await supabase
      .from('config_branches')
      .select(`
        id,
        name,
        course_id,
        config_courses!inner(id, name)
      `)
      .eq('is_active', true)
      .is('config_courses.id', null);
    
    if (orphanError) {
      console.error('❌ Error checking orphan branches:', orphanError.message);
    } else if (orphanBranches && orphanBranches.length > 0) {
      console.error(`⚠️  WARNING: ${orphanBranches.length} branches have invalid course_id!`);
      orphanBranches.slice(0, 3).forEach(b => {
        console.error(`   - ${b.name} (course_id: ${b.course_id})`);
      });
    } else {
      console.log('✅ All branches have valid course references');
    }
  } catch (err) {
    console.error('❌ Failed to check branch relationships:', err.message);
  }
  
  // Check 3: Table structure (admission_year and passing_year data types)
  console.log('\n\n🔧 CHECK 3: Table Structure (no_dues_forms)\n');
  
  try {
    // Check if table exists by trying to query it
    const { error: tableError } = await supabase
      .from('no_dues_forms')
      .select('id')
      .limit(1);
    
    if (tableError) {
      if (tableError.code === '42P01') {
        console.error('❌ no_dues_forms table does not exist!');
        console.error('   Run FINAL_COMPLETE_DATABASE_SETUP.sql to create it');
      } else {
        console.error('❌ Error accessing no_dues_forms:', tableError.message);
      }
    } else {
      console.log('✅ no_dues_forms table exists');
      
      // Try to get column information (this is a workaround since we can't directly query information_schema)
      const { data: sampleForm } = await supabase
        .from('no_dues_forms')
        .select('admission_year, passing_year')
        .limit(1)
        .single();
      
      if (sampleForm) {
        console.log('\n   Sample data:');
        console.log(`   - admission_year: ${sampleForm.admission_year} (type: ${typeof sampleForm.admission_year})`);
        console.log(`   - passing_year: ${sampleForm.passing_year} (type: ${typeof sampleForm.passing_year})`);
        
        if (typeof sampleForm.admission_year === 'number' || typeof sampleForm.passing_year === 'number') {
          console.error('\n⚠️  WARNING: Years are stored as numbers, but API sends strings!');
          console.error('   This will cause form submission to fail');
          console.error('   Run FINAL_COMPLETE_DATABASE_SETUP.sql to fix column types');
        }
      } else {
        console.log('   (No forms submitted yet, cannot check data types)');
      }
    }
  } catch (err) {
    console.error('❌ Failed to check table structure:', err.message);
  }
  
  // Check 4: Recent form submission attempts
  console.log('\n\n📝 CHECK 4: Recent Form Submissions\n');
  
  try {
    const { data: recentForms, error: formError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (formError) {
      console.error('❌ Error fetching forms:', formError.message);
    } else if (!recentForms || recentForms.length === 0) {
      console.log('ℹ️  No forms have been submitted yet');
    } else {
      console.log(`✅ Found ${recentForms.length} recent submissions:\n`);
      recentForms.forEach(f => {
        console.log(`   - ${f.registration_no}: ${f.student_name} (${f.status}) - ${new Date(f.created_at).toLocaleString()}`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to check recent forms:', err.message);
  }
  
  // Check 5: Departments
  console.log('\n\n🏢 CHECK 5: Departments Configuration\n');
  
  try {
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name, display_name, email, is_active')
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error fetching departments:', deptError.message);
    } else if (!departments || departments.length === 0) {
      console.error('❌ No departments found!');
      console.error('   Run FINAL_COMPLETE_DATABASE_SETUP.sql to create departments');
    } else {
      const activeCount = departments.filter(d => d.is_active).length;
      console.log(`✅ departments: ${departments.length} total, ${activeCount} active`);
      
      if (activeCount !== 10) {
        console.warn(`⚠️  WARNING: Expected 10 active departments, found ${activeCount}`);
      }
      
      console.log('\n   Departments:');
      departments.forEach(d => {
        console.log(`   - ${d.display_name}: ${d.email} [${d.is_active ? 'ACTIVE' : 'INACTIVE'}]`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to check departments:', err.message);
  }
  
  // Final recommendations
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 DIAGNOSIS COMPLETE - RECOMMENDATIONS\n');
  
  console.log('If you see any ❌ or ⚠️  warnings above, you MUST:');
  console.log('');
  console.log('1. Open Supabase Dashboard → SQL Editor');
  console.log('2. Run the ENTIRE contents of: FINAL_COMPLETE_DATABASE_SETUP.sql');
  console.log('3. Clear browser cache (Ctrl + Shift + Delete)');
  console.log('4. Try form submission again in Incognito mode');
  console.log('');
  console.log('Expected results after running SQL:');
  console.log('  ✅ 13 active schools');
  console.log('  ✅ 28 active courses');
  console.log('  ✅ 139 active branches');
  console.log('  ✅ 10 active departments');
  console.log('  ✅ admission_year and passing_year as TEXT columns');
  console.log('');
  console.log('For detailed instructions, see: URGENT_FIX_FORM_VALIDATION.md');
  console.log('='.repeat(60));
}

diagnose().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message);
  process.exit(1);
});