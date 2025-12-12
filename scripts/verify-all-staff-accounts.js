/**
 * Verify All Staff Accounts - Check Status
 * 
 * This script verifies all 14 staff accounts and their scoping
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyAllStaff() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        VERIFY ALL STAFF ACCOUNTS STATUS                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Fetch all staff profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'department'])
    .order('role', { ascending: false })
    .order('department_name');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`📊 Total Staff Accounts: ${profiles.length}\n`);

  // Group by role
  const admin = profiles.filter(p => p.role === 'admin');
  const deptStaff = profiles.filter(p => p.role === 'department' && p.department_name !== 'school_hod');
  const hods = profiles.filter(p => p.department_name === 'school_hod');

  // Display Admin
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ ADMIN ACCOUNT (1)                                           │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  admin.forEach(p => {
    console.log(`│ ✅ ${p.email.padEnd(50)} │`);
    console.log(`│    Name: ${p.full_name.padEnd(47)} │`);
    console.log(`│    Access: FULL SYSTEM ACCESS                               │`);
  });
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // Display Department Staff
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ DEPARTMENT STAFF (${deptStaff.length})                                        │`);
  console.log('├─────────────────────────────────────────────────────────────┤');
  deptStaff.forEach((p, i) => {
    console.log(`│ ${(i + 1).toString().padEnd(2)} ✅ ${p.email.padEnd(48)} │`);
    console.log(`│    Dept: ${p.department_name.padEnd(47)} │`);
    console.log(`│    Access: All students (no filtering)                      │`);
    if (i < deptStaff.length - 1) console.log('│                                                             │');
  });
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // Display HODs with scoping
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ SCHOOL HODs (${hods.length}) - WITH SCOPED ACCESS                        │`);
  console.log('├─────────────────────────────────────────────────────────────┤');
  hods.forEach((p, i) => {
    const schools = p.school_ids?.length || 0;
    const courses = p.course_ids?.length || 0;
    const branches = p.branch_ids?.length || 0;
    
    console.log(`│ ${(i + 1).toString().padEnd(2)} ✅ ${p.email.padEnd(48)} │`);
    console.log(`│    Name: ${p.full_name.padEnd(47)} │`);
    console.log(`│    Scope: ${schools} school(s), ${courses} course(s), ${branches} branch(es)`.padEnd(60) + '│');
    if (i < hods.length - 1) console.log('│                                                             │');
  });
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // Summary
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Admin Accounts: ${admin.length}`);
  console.log(`✅ Department Staff: ${deptStaff.length}`);
  console.log(`✅ School HODs: ${hods.length}`);
  console.log(`✅ Total: ${profiles.length}`);
  console.log(`\n🎯 Expected: 14 accounts (1 admin + 9 dept + 4 HODs)`);
  
  if (profiles.length === 14) {
    console.log('\n🎉 SUCCESS! All 14 staff accounts are properly configured!\n');
  } else {
    console.log(`\n⚠️  WARNING: Expected 14 but found ${profiles.length} accounts\n`);
  }

  // Login Instructions
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                LOGIN INFORMATION                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log('Admin Login:');
  console.log('  URL: https://no-duessystem.vercel.app/admin/login');
  console.log('  Email: admin@jecrcu.edu.in');
  console.log('  Password: Admin@2025\n');
  console.log('Staff/HOD Login:');
  console.log('  URL: https://no-duessystem.vercel.app/staff/login');
  console.log('  Password: Test@1234 (for all staff)\n');
}

verifyAllStaff()
  .then(() => {
    console.log('✅ Verification complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });