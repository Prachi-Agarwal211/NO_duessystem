// Complete schema dump from Supabase
const fs = require('fs');
const path = require('path');

// Load environment
function loadEnv() {
  const envFiles = ['../.env.local', '../.env'];
  envFiles.forEach(envFile => {
    const filePath = path.join(__dirname, envFile);
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
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
  });
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function dumpCompleteSchema() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║          COMPLETE SUPABASE SCHEMA DUMP                             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // 1. AUTH.USERS - Complete dump
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ 1. AUTH.USERS (Complete List)                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const { users } = await usersResponse.json();

  console.log(`Total: ${users.length} users\n`);
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ # │ Email                        │ ID                                   │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  users.forEach((user, i) => {
    const email = user.email.padEnd(28).substring(0, 28);
    const id = user.id.substring(0, 35);
    console.log(`│ ${(i+1).toString().padEnd(2)} │ ${email} │ ${id} │`);
  });
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  // 2. PROFILES - Complete dump
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ 2. PROFILES (Complete List)                                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const profiles = await profilesResponse.json();

  console.log(`Total: ${profiles.length} profiles\n`);
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ # │ Email                        │ Role      │ Active │ ID       │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  profiles.forEach((p, i) => {
    const email = p.email.padEnd(28).substring(0, 28);
    const role = p.role.padEnd(9).substring(0, 9);
    const active = p.is_active ? 'Yes' : 'No';
    const id = p.id.substring(0, 7) + '...';
    console.log(`│ ${(i+1).toString().padEnd(2)} │ ${email} │ ${role} │ ${active}    │ ${id} │`);
  });
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  // 3. DEPARTMENTS - Complete dump
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ 3. DEPARTMENTS (Complete List)                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const deptResponse = await fetch(`${SUPABASE_URL}/rest/v1/departments?select=*`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const departments = await deptResponse.json();

  console.log(`Total: ${departments.length} departments\n`);
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ # │ Name                         │ Display Name                       │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  departments.forEach((d, i) => {
    const name = (d.name || '').padEnd(28).substring(0, 28);
    const display = (d.display_name || '').padEnd(30).substring(0, 30);
    console.log(`│ ${(i+1).toString().padEnd(2)} │ ${name} │ ${display} │`);
  });
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  // 4. AUTH vs PROFILES MATCHING ANALYSIS
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ 4. MATCHING ANALYSIS                                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const authByEmail = new Map();
  users.forEach(u => authByEmail.set(u.email.toLowerCase(), u));

  let matched = 0;
  let mismatched = 0;
  let noProfile = 0;

  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ Email                        │ Auth ID (8 chars) │ Profile Match  │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  users.forEach(u => {
    const profile = profiles.find(p => p.email.toLowerCase() === u.email.toLowerCase());
    const email = u.email.substring(0, 27);
    const authId = u.id.substring(0, 8);

    let status = '❌ NO PROFILE';
    if (profile) {
      if (profile.id === u.id) {
        status = '✅ MATCH';
        matched++;
      } else {
        status = '🔄 MISMATCH';
        mismatched++;
      }
    } else {
      noProfile++;
    }

    console.log(`│ ${email.padEnd(27)} │ ${authId}            │ ${status}     │`);
  });

  console.log('└─────────────────────────────────────────────────────────────────────┘');

  console.log('\n📊 SUMMARY:');
  console.log(`   ✅ Matched (login will work): ${matched}`);
  console.log(`   🔄 Mismatched IDs: ${mismatched}`);
  console.log(`   ❌ No profile: ${noProfile}`);
  console.log(`   📋 Total: ${users.length}`);

  // 5. WORKING ACCOUNTS
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║ 5. WORKING ACCOUNTS (Can login now)                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const working = [];
  users.forEach(u => {
    const profile = profiles.find(p => p.email.toLowerCase() === u.email.toLowerCase());
    if (profile && profile.id === u.id && profile.is_active) {
      working.push(profile);
    }
  });

  working.forEach((p, i) => {
    console.log(`${i + 1}. ${p.full_name || 'Unknown'}`);
    console.log(`   Email: ${p.email}`);
    console.log(`   Role: ${p.role}`);
    console.log(`   Department: ${p.department_name || 'N/A'}`);
    console.log('');
  });

  console.log('═'.repeat(70));
  console.log('💡 TO LOGIN: Use any of the above working accounts');
  console.log('   URL: /staff/login');
  console.log('   Password: Jecrc@2026 (if not changed)');
  console.log('═'.repeat(70));
}

dumpCompleteSchema().catch(console.error);
