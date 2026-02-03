// Script to check what the librarian dashboard would show
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLibrarianDashboard() {
  console.log('🔍 CHECKING LIBRARIAN DASHBOARD DATA...\n');

  // Get librarian profile
  const { data: librarian } = await supabase
    .from('profiles')
    .select('id, email, full_name, assigned_department_ids, department_name')
    .eq('email', 'librarian@jecrcu.edu.in')
    .single();

  console.log('Librarian profile:', librarian);

  // Get library department
  const { data: libraryDept } = await supabase
    .from('departments')
    .select('id, name')
    .eq('name', 'library')
    .single();

  console.log('Library department:', libraryDept);

  // Check if librarian has correct department ID
  const hasCorrectDept = librarian.assigned_department_ids?.includes(libraryDept.id);
  console.log('\nHas correct department ID:', hasCorrectDept);

  // Count library status records
  console.log('\n📊 Library status records:');

  // Pending forms for library
  const { count: pendingCount } = await supabase
    .from('no_dues_status')
    .select('*', { count: 'exact', head: true })
    .eq('department_name', 'library')
    .eq('status', 'pending');

  console.log('  Pending:', pendingCount);

  // Approved by library
  const { count: approvedCount } = await supabase
    .from('no_dues_status')
    .select('*', { count: 'exact', head: true })
    .eq('department_name', 'library')
    .eq('status', 'approved');

  console.log('  Approved:', approvedCount);

  // Rejected by library
  const { count: rejectedCount } = await supabase
    .from('no_dues_status')
    .select('*', { count: 'exact', head: true })
    .eq('department_name', 'library')
    .eq('status', 'rejected');

  console.log('  Rejected:', rejectedCount);

  // Total library status records
  const { count: totalCount } = await supabase
    .from('no_dues_status')
    .select('*', { count: 'exact', head: true })
    .eq('department_name', 'library');

  console.log('  Total:', totalCount);

  // Get all library status records (sample)
  console.log('\n📋 Sample library status records:');
  const { data: libStatus } = await supabase
    .from('no_dues_status')
    .select('form_id, status, action_at')
    .eq('department_name', 'library')
    .order('action_at', { ascending: false })
    .limit(10);

  libStatus?.forEach(s => {
    console.log(`  ${s.form_id}: ${s.status} at ${s.action_at}`);
  });

  // Check what forms are visible in the dashboard
  // The dashboard shows forms where:
  // 1. department_name is in myDeptNames
  // 2. status is 'pending'
  console.log('\n📋 Forms that would appear in librarian dashboard (pending):');

  const { data: pendingForms } = await supabase
    .from('no_dues_status')
    .select(`
      id,
      status,
      no_dues_forms!inner (
        id,
        registration_no,
        student_name
      )
    `)
    .eq('department_name', 'library')
    .eq('status', 'pending')
    .limit(20);

  console.log('Pending forms count:', pendingForms?.length || 0);
  pendingForms?.forEach(f => {
    console.log(`  ${f.no_dues_forms.registration_no} - ${f.no_dues_forms.student_name}`);
  });

  if (!pendingForms || pendingForms.length === 0) {
    console.log('\n⚠️  No pending forms for library!');
    console.log('   This means the librarian has nothing to approve/reject.');
    console.log('   All library status records are either approved or rejected.');
  }
}

checkLibrarianDashboard().catch(console.error);
