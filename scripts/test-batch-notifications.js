#!/usr/bin/env node

/**
 * Test batch email notification logic
 * Verifies that all 11 staff members would receive notifications
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { notifyAllDepartments } from '../src/lib/emailService.js';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBatchNotifications() {
  console.log('🧪 Testing Batch Email Notification Logic...\n');

  // Step 1: Fetch all staff (same as in student/route.js)
  console.log('1️⃣ Fetching all staff members...');
  const { data: allStaff, error: staffError } = await supabase
    .from('profiles')
    .select('id, email, full_name, department_name, school_id, school_ids, course_ids, branch_ids')
    .eq('role', 'department')
    .not('email', 'is', null);

  if (staffError) {
    console.error('❌ Error fetching staff:', staffError);
    process.exit(1);
  }

  console.log(`   ✅ Found ${allStaff.length} staff members\n`);

  // Step 2: Simulate a student submission (B.Tech CSE)
  console.log('2️⃣ Simulating student form submission...');
  
  // Get a real school/course/branch from database for testing
  const { data: schools } = await supabase
    .from('config_schools')
    .select('id, name')
    .eq('is_active', true)
    .limit(1)
    .single();

  const { data: courses } = await supabase
    .from('config_courses')
    .select('id, name, school_id')
    .eq('school_id', schools.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const { data: branches } = await supabase
    .from('config_branches')
    .select('id, name, course_id')
    .eq('course_id', courses.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  console.log(`   Student Profile:`);
  console.log(`   - School: ${schools.name}`);
  console.log(`   - Course: ${courses.name}`);
  console.log(`   - Branch: ${branches.name}\n`);

  // Step 3: Filter staff based on scope (same logic as student/route.js)
  console.log('3️⃣ Filtering staff based on scope rules...');
  const staffToNotify = allStaff.filter(staff => {
    // If school_hod staff (HOD/Dean), apply scope filtering
    if (staff.department_name === 'school_hod') {
      // Check school scope
      if (staff.school_ids && staff.school_ids.length > 0) {
        if (!staff.school_ids.includes(schools.id)) {
          console.log(`   ⚠️  Filtered out: ${staff.full_name} (school mismatch)`);
          return false;
        }
      } else if (staff.school_id && staff.school_id !== schools.id) {
        console.log(`   ⚠️  Filtered out: ${staff.full_name} (school mismatch)`);
        return false;
      }
      
      // Check course scope
      if (staff.course_ids && staff.course_ids.length > 0) {
        if (!staff.course_ids.includes(courses.id)) {
          console.log(`   ⚠️  Filtered out: ${staff.full_name} (course mismatch)`);
          return false;
        }
      }
      
      // Check branch scope
      if (staff.branch_ids && staff.branch_ids.length > 0) {
        if (!staff.branch_ids.includes(branches.id)) {
          console.log(`   ⚠️  Filtered out: ${staff.full_name} (branch mismatch)`);
          return false;
        }
      }
      
      console.log(`   ✅ Included: ${staff.full_name} (${staff.department_name}) - scope match`);
      return true;
    }
    
    // For all other 10 departments, notify everyone
    console.log(`   ✅ Included: ${staff.full_name} (${staff.department_name}) - no filtering`);
    return true;
  });

  console.log(`\n   📊 Result: ${staffToNotify.length}/${allStaff.length} staff members will be notified\n`);

  // Step 4: Display who will receive emails
  console.log('4️⃣ Staff members who will receive email notifications:');
  console.log('   ' + '='.repeat(70));
  staffToNotify.forEach((staff, index) => {
    console.log(`   ${index + 1}. ${staff.full_name.padEnd(30)} | ${staff.department_name.padEnd(20)} | ${staff.email}`);
  });
  console.log('   ' + '='.repeat(70) + '\n');

  // Step 5: Test email service (dry run - set DRY_RUN=true to skip actual sending)
  const dryRun = process.env.DRY_RUN === 'true';
  
  if (dryRun) {
    console.log('5️⃣ DRY RUN MODE - Skipping actual email send');
    console.log(`   Would send ${staffToNotify.length} emails via notifyAllDepartments()\n`);
  } else {
    console.log('5️⃣ Sending test batch notification...');
    console.log('   ⚠️  This will send REAL emails to all staff!\n');
    
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://no-duessystem.vercel.app';
    
    try {
      const startTime = Date.now();
      const emailResults = await notifyAllDepartments({
        staffMembers: staffToNotify.map(staff => ({
          email: staff.email,
          name: staff.full_name,
          department: staff.department_name
        })),
        studentName: 'Test Student',
        registrationNo: 'TEST123',
        formId: '00000000-0000-0000-0000-000000000000',
        dashboardUrl: `${dashboardUrl}/staff/login`
      });
      const endTime = Date.now();
      
      const successful = emailResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = emailResults.length - successful;
      
      console.log(`\n   ✅ Batch completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);
      console.log(`   📧 Successful: ${successful}/${emailResults.length}`);
      if (failed > 0) {
        console.log(`   ❌ Failed: ${failed}/${emailResults.length}`);
        emailResults.forEach((result, index) => {
          if (result.status === 'rejected' || !result.value.success) {
            console.log(`      - ${staffToNotify[index].email}: ${result.reason || result.value.error}`);
          }
        });
      }
      console.log();
    } catch (error) {
      console.error('   ❌ Email batch failed:', error);
    }
  }

  console.log('✅ Test complete!\n');
  console.log('📝 Summary:');
  console.log(`   - Total staff in database: ${allStaff.length}`);
  console.log(`   - Staff to be notified: ${staffToNotify.length}`);
  console.log(`   - Filtering logic: ${staffToNotify.length === allStaff.length ? 'No filtering (all notified)' : 'HOD scope filtering applied'}`);
  console.log();
}

// Run test
testBatchNotifications().catch(console.error);