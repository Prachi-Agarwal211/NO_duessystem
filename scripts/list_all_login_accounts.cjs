// List all profiles and explain login capability
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment from .env.local
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

async function listAllLoginAccounts() {
  console.log('📋 COMPLETE PROFILE TABLE ANALYSIS\n');
  console.log('='.repeat(60));

  // Get all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, department_name, is_active');

  if (error) {
    console.error('❌ Error fetching profiles:', error.message);
    return;
  }

  console.log(`📊 Total profiles: ${profiles?.length || 0}\n`);

  // Separate by role
  const adminProfiles = profiles?.filter(p => p.role === 'admin') || [];
  const departmentProfiles = profiles?.filter(p => p.role === 'department') || [];
  const otherProfiles = profiles?.filter(p => p.role !== 'admin' && p.role !== 'department') || [];

  console.log('🔐 LOGIN ACCOUNTS BY ROLE:\n');

  console.log('='.repeat(60));
  console.log('👑 ADMIN ACCOUNTS (Can login to /admin dashboard)');
  console.log('='.repeat(60));
  if (adminProfiles.length === 0) {
    console.log('❌ No admin accounts found');
  } else {
    adminProfiles.forEach(p => {
      console.log(`\n  Email: ${p.email}`);
      console.log(`  Name: ${p.full_name}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Status: ${p.is_active ? '✅ Active' : '❌ Inactive'}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏛️ DEPARTMENT ACCOUNTS (Can login to /staff/dashboard)');
  console.log('='.repeat(60));
  if (departmentProfiles.length === 0) {
    console.log('❌ No department accounts found');
  } else {
    departmentProfiles.forEach(p => {
      console.log(`\n  Email: ${p.email}`);
      console.log(`  Name: ${p.full_name}`);
      console.log(`  Department: ${p.department_name || 'Not specified'}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Status: ${p.is_active ? '✅ Active' : '❌ Inactive'}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 ALL PROFILES (Complete List)');
  console.log('='.repeat(60));
  profiles?.forEach((p, index) => {
    const roleIcon = p.role === 'admin' ? '👑' : p.role === 'department' ? '🏛️' : '📋';
    console.log(`\n${index + 1}. ${roleIcon} ${p.full_name}`);
    console.log(`   Email: ${p.email}`);
    console.log(`   Role: ${p.role}`);
    console.log(`   Department: ${p.department_name || 'N/A'}`);
    console.log(`   Active: ${p.is_active ? '✅' : '❌'}`);
    console.log(`   ID: ${p.id}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('🔑 HOW TO LOGIN:');
  console.log('='.repeat(60));
  console.log('\n1. ADMIN LOGIN:');
  console.log('   - Go to: /admin');
  console.log('   - Or: /staff/login (then redirect to admin)');
  console.log('   - Email: admin@jecrcu.edu.in');
  console.log('   - Password: Jecrc@2026');

  console.log('\n2. DEPARTMENT HOD LOGIN:');
  console.log('   - Go to: /staff/login');
  console.log('   - Use any department email from above');
  console.log('   - Password: Same as their original signup (if changed)');
  console.log('   - Default password: Jecrc@2026 (if not changed)');

  console.log('\n' + '='.repeat(60));
  console.log('⚠️  IMPORTANT NOTES:');
  console.log('='.repeat(60));
  console.log('\n1. Passwords may need to be reset if not known');
  console.log('2. Only accounts with is_active=true can login');
  console.log('3. Role determines which dashboard they access');
  console.log('4. The profile ID must match the auth.user ID');
}

listAllLoginAccounts().catch(console.error);
