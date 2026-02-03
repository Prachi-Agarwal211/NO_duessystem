// Fix the profile ID mismatch for razorrag.official@gmail.com
const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixProfileIdMismatch() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              FIXING PROFILE ID MISMATCH                           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get the mismatched profile
    console.log('1️⃣  FINDING MISMATCHED PROFILE');
    console.log('-'.repeat(70));
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'razorrag.official@gmail.com')
      .single();
    
    if (profileError) {
      console.error('❌ Error finding profile:', profileError);
      return;
    }
    
    console.log(`📊 Found profile:`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Profile ID: ${profile.id}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Department: ${profile.department_name}`);
    
    // 2. Get the auth user
    console.log('\n2️⃣  FINDING AUTH USER');
    console.log('-'.repeat(70));
    
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email.toLowerCase() === 'razorrag.official@gmail.com');
    
    if (!authUser) {
      console.error('❌ Auth user not found');
      return;
    }
    
    console.log(`📊 Found auth user:`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Auth ID: ${authUser.id}`);
    console.log(`   Created: ${authUser.created_at}`);
    
    // 3. Show the mismatch
    console.log('\n3️⃣  IDENTIFYING MISMATCH');
    console.log('-'.repeat(70));
    
    if (profile.id === authUser.id) {
      console.log('✅ No mismatch found - IDs already match!');
      return;
    }
    
    console.log(`⚠️  ID MISMATCH detected:`);
    console.log(`   Profile ID: ${profile.id}`);
    console.log(`   Auth ID: ${authUser.id}`);
    
    // 4. Fix the mismatch by updating profile ID
    console.log('\n4️⃣  FIXING MISMATCH');
    console.log('-'.repeat(70));
    
    // First, check if there are any references to the old profile ID
    console.log('🔍 Checking for references to old profile ID...');
    
    const tablesToCheck = [
      { name: 'no_dues_status', column: 'action_by' },
      { name: 'chat_messages', column: 'sender_id' },
      { name: 'chat_unread_counts', column: 'user_id' }
    ];
    
    let hasReferences = false;
    for (const table of tablesToCheck) {
      try {
        const { data: refs, error: refError } = await supabase
          .from(table.name)
          .select('id')
          .eq(table.column, profile.id)
          .limit(1);
        
        if (!refError && refs && refs.length > 0) {
          console.log(`⚠️  Found references in ${table.name}.${table.column}`);
          hasReferences = true;
        }
      } catch (e) {
        // Table might not exist, continue
      }
    }
    
    if (hasReferences) {
      console.log('⚠️  Profile has references - updating ID might break relationships');
      console.log('📝 Alternative approach: Update auth user ID to match profile ID');
      console.log('   (This requires recreating the auth user)');
    } else {
      console.log('✅ No references found - safe to update profile ID');
      
      // Update the profile ID to match auth user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: authUser.id })
        .eq('id', profile.id);
      
      if (updateError) {
        console.error('❌ Error updating profile ID:', updateError);
        
        // Try alternative approach - delete and recreate
        console.log('🔄 Trying alternative approach - delete and recreate profile...');
        
        // Delete old profile
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id);
        
        if (deleteError) {
          console.error('❌ Error deleting old profile:', deleteError);
        } else {
          console.log('✅ Old profile deleted');
          
          // Create new profile with correct ID
          const newProfile = {
            id: authUser.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            department_name: profile.department_name,
            assigned_department_ids: profile.assigned_department_ids,
            is_active: profile.is_active,
            created_at: profile.created_at,
            updated_at: new Date().toISOString()
          };
          
          const { error: createError } = await supabase
            .from('profiles')
            .insert(newProfile);
          
          if (createError) {
            console.error('❌ Error creating new profile:', createError);
          } else {
            console.log('✅ New profile created with correct ID');
          }
        }
      } else {
        console.log('✅ Profile ID updated successfully');
      }
    }
    
    // 5. Verify the fix
    console.log('\n5️⃣  VERIFYING THE FIX');
    console.log('-'.repeat(70));
    
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'razorrag.official@gmail.com')
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying fix:', verifyError);
    } else {
      console.log(`📊 Updated profile:`);
      console.log(`   Email: ${updatedProfile.email}`);
      console.log(`   Profile ID: ${updatedProfile.id}`);
      console.log(`   Auth ID: ${authUser.id}`);
      
      if (updatedProfile.id === authUser.id) {
        console.log('✅ SUCCESS: Profile ID now matches Auth ID!');
      } else {
        console.log('❌ FAILED: IDs still do not match');
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔧 PROFILE ID MISMATCH FIX COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixProfileIdMismatch();
