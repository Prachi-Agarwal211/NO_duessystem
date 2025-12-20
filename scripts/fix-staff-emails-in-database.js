/**
 * Fix Staff Email Addresses in Database
 * 
 * This script updates incorrect email addresses in the database:
 * - ashokh.singh@jecrcu.edu.in → ashok.singh@jecrcu.edu.in
 * - yogesh.jhoshi@jecrcu.edu.in → yogesh.joshi@jecrcu.edu.in
 * 
 * Also updates names:
 * - Ashokh Singh → Ashok Singh
 * - Yogesh Jhoshi → Yogesh Joshi
 * 
 * Usage: node scripts/fix-staff-emails-in-database.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Staff email corrections
const EMAIL_CORRECTIONS = [
  {
    oldEmail: 'ashokh.singh@jecrcu.edu.in',
    newEmail: 'ashok.singh@jecrcu.edu.in',
    oldName: 'Ashokh Singh',
    newName: 'Ashok Singh',
    department: 'Registrar'
  },
  {
    oldEmail: 'yogesh.jhoshi@jecrcu.edu.in',
    newEmail: 'yogesh.joshi@jecrcu.edu.in',
    oldName: 'Yogesh Jhoshi',
    newName: 'Yogesh Joshi',
    department: 'Accounts'
  }
];

async function updateAuthUser(oldEmail, newEmail) {
  try {
    // Get user by old email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`   ❌ Error listing users:`, listError.message);
      return { success: false, error: listError.message };
    }

    const user = users.users.find(u => u.email === oldEmail);
    
    if (!user) {
      console.log(`   ⚠️  User not found in auth with email: ${oldEmail}`);
      return { success: false, error: 'User not found in auth' };
    }

    // Update user email
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email: newEmail }
    );

    if (updateError) {
      console.error(`   ❌ Error updating auth user:`, updateError.message);
      return { success: false, error: updateError.message };
    }

    console.log(`   ✅ Updated auth email: ${oldEmail} → ${newEmail}`);
    return { success: true, userId: user.id };
  } catch (error) {
    console.error(`   ❌ Exception updating auth user:`, error.message);
    return { success: false, error: error.message };
  }
}

async function updateProfile(oldEmail, newEmail, newName) {
  try {
    // Update profile by old email
    const { data, error } = await supabase
      .from('profiles')
      .update({
        email: newEmail,
        full_name: newName
      })
      .eq('email', oldEmail)
      .select();

    if (error) {
      console.error(`   ❌ Error updating profile:`, error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.log(`   ⚠️  Profile not found with email: ${oldEmail}`);
      return { success: false, error: 'Profile not found' };
    }

    console.log(`   ✅ Updated profile: ${oldEmail} → ${newEmail}, name: ${newName}`);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error(`   ❌ Exception updating profile:`, error.message);
    return { success: false, error: error.message };
  }
}

async function fixStaffEmails() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║       Fixing Staff Email Addresses in Database           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Verify Supabase configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase configuration missing!');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  console.log('🔄 Email Corrections to Apply:');
  EMAIL_CORRECTIONS.forEach(correction => {
    console.log(`   • ${correction.oldEmail} → ${correction.newEmail}`);
    console.log(`     ${correction.oldName} → ${correction.newName}`);
  });
  console.log('');

  const results = {
    success: [],
    failed: []
  };

  for (const correction of EMAIL_CORRECTIONS) {
    console.log(`\n📝 Processing: ${correction.oldName} (${correction.department})`);
    console.log(`   Old Email: ${correction.oldEmail}`);
    console.log(`   New Email: ${correction.newEmail}`);

    // Update auth user
    const authResult = await updateAuthUser(correction.oldEmail, correction.newEmail);
    
    // Update profile
    const profileResult = await updateProfile(
      correction.oldEmail, 
      correction.newEmail, 
      correction.newName
    );

    if (authResult.success && profileResult.success) {
      console.log(`   ✅ All updates successful for ${correction.newName}`);
      results.success.push(correction);
    } else {
      console.log(`   ⚠️  Partial or failed update for ${correction.oldName}`);
      results.failed.push({
        ...correction,
        authSuccess: authResult.success,
        profileSuccess: profileResult.success,
        authError: authResult.error,
        profileError: profileResult.error
      });
    }

    // Wait 1 second between updates
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                UPDATE SUMMARY                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (results.success.length > 0) {
    console.log('✅ Successfully Updated:');
    console.log('─'.repeat(70));
    results.success.forEach(item => {
      console.log(`   ✓ ${item.newEmail} (${item.newName})`);
    });
    console.log('─'.repeat(70));
  }

  if (results.failed.length > 0) {
    console.log('\n⚠️  Failed or Partial Updates:');
    console.log('─'.repeat(70));
    results.failed.forEach(item => {
      console.log(`   ✗ ${item.oldEmail}:`);
      if (!item.authSuccess) console.log(`      - Auth update failed: ${item.authError}`);
      if (!item.profileSuccess) console.log(`      - Profile update failed: ${item.profileError}`);
    });
    console.log('─'.repeat(70));
  }

  console.log('\n📊 Statistics:');
  console.log(`   Total: ${EMAIL_CORRECTIONS.length}`);
  console.log(`   Success: ${results.success.length}`);
  console.log(`   Failed: ${results.failed.length}\n`);

  if (results.success.length === EMAIL_CORRECTIONS.length) {
    console.log('✅ All email addresses have been corrected in the database!\n');
    console.log('📧 Next Steps:');
    console.log('─'.repeat(70));
    console.log('• Run: node scripts/send-corrected-staff-emails.js');
    console.log('• This will send welcome emails to the corrected addresses');
    console.log('─'.repeat(70));
  }
}

// Run the script
fixStaffEmails()
  .then(() => {
    console.log('\n✅ Database update completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    console.error(error);
    process.exit(1);
  });