/**
 * Check Environment Variables
 * Validates that all required environment variables are set
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

console.log('\n🔍 Checking Environment Variables...\n');
console.log('═'.repeat(60));

const requiredVars = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
  { name: 'RESEND_API_KEY', required: false },
  { name: 'RESEND_FROM', required: false },
  { name: 'NEXT_PUBLIC_BASE_URL', required: false },
  { name: 'JWT_SECRET', required: false }
];

let allOk = true;
const missing = [];

for (const envVar of requiredVars) {
  const value = process.env[envVar.name];
  const isSet = value !== undefined && value !== '';
  
  if (envVar.required && !isSet) {
    console.log(`❌ ${envVar.name}: MISSING (REQUIRED)`);
    allOk = false;
    missing.push(envVar.name);
  } else if (envVar.required && isSet) {
    const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
    console.log(`✅ ${envVar.name}: Set (${displayValue})`);
  } else if (!envVar.required && isSet) {
    const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
    console.log(`⚠️  ${envVar.name}: Set (${displayValue}) - Optional`);
  } else {
    console.log(`⚪ ${envVar.name}: Not set (Optional)`);
  }
}

console.log('\n' + '═'.repeat(60));

if (!allOk) {
  console.log('\n❌ Missing Required Environment Variables!');
  console.log('\n📝 Please create or update .env.local file with:');
  missing.forEach(name => {
    console.log(`   ${name}=your_value_here`);
  });
  console.log('\n📍 File location: .env.local (in project root)\n');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
  console.log('\n📝 To verify Supabase connection, run:');
  console.log('   npm run setup:storage\n');
}

