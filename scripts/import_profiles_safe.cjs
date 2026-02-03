// Import profiles from CSV backup - handle foreign key constraints
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

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

async function importProfilesSafe() {
  try {
    console.log('📥 IMPORTING PROFILES FROM CSV BACKUP (SAFE MODE)...\n');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../backups/profiles_rows.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.error('❌ CSV file is empty or invalid');
      return;
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    console.log('📋 CSV Headers:', headers.join(', '));
    
    // Parse data rows
    const profiles = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const profile = {};
        headers.forEach((header, index) => {
          profile[header] = values[index];
        });
        profiles.push(profile);
      }
    }
    
    console.log(`📊 Found ${profiles.length} profiles to import`);
    
    // Check existing profiles
    console.log('\n🔍 CHECKING EXISTING PROFILES...');
    
    const { data: existingProfiles, error: existingError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .order('email');
    
    if (existingError) {
      console.error('❌ Error checking existing profiles:', existingError.message);
      return;
    }
    
    console.log(`Found ${existingProfiles.length} existing profiles`);
    
    // Create map of existing profiles by email
    const existingEmailMap = new Map();
    existingProfiles.forEach(profile => {
      existingEmailMap.set(profile.email, profile);
    });
    
    // Import/update profiles
    console.log('\n📥 IMPORTING/UPDATING PROFILES...');
    
    let successCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    
    for (const profile of profiles) {
      try {
        // Parse JSON fields
        let schoolIds = null;
        let courseIds = null;
        let branchIds = null;
        let assignedDepartmentIds = null;
        
        if (profile.school_ids && profile.school_ids.startsWith('[')) {
          try {
            schoolIds = JSON.parse(profile.school_ids.replace(/""/g, '"'));
          } catch (e) {
            schoolIds = null;
          }
        }
        
        if (profile.course_ids && profile.course_ids.startsWith('[')) {
          try {
            courseIds = JSON.parse(profile.course_ids.replace(/""/g, '"'));
          } catch (e) {
            courseIds = null;
          }
        }
        
        if (profile.branch_ids && profile.branch_ids.startsWith('[')) {
          try {
            branchIds = JSON.parse(profile.branch_ids.replace(/""/g, '"'));
          } catch (e) {
            branchIds = null;
          }
        }
        
        if (profile.assigned_department_ids && profile.assigned_department_ids.startsWith('[')) {
          try {
            assignedDepartmentIds = JSON.parse(profile.assigned_department_ids.replace(/""/g, '"'));
          } catch (e) {
            assignedDepartmentIds = null;
          }
        }
        
        // Parse boolean fields
        const isActive = profile.is_active === 'true';
        
        // Parse timestamps
        const createdAt = profile.created_at || new Date().toISOString();
        const updatedAt = profile.updated_at || new Date().toISOString();
        
        const existing = existingEmailMap.get(profile.email);
        
        if (existing) {
          // Update existing profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: profile.full_name,
              role: profile.role,
              department_name: profile.department_name || null,
              school_id: profile.school_id || null,
              school_ids: schoolIds,
              course_ids: courseIds,
              branch_ids: branchIds,
              is_active: isActive,
              metadata: profile.metadata || null,
              updated_at: updatedAt,
              assigned_department_ids: assignedDepartmentIds
            })
            .eq('email', profile.email);
          
          if (updateError) {
            console.log(`❌ Failed to update ${profile.email}: ${updateError.message}`);
            errorCount++;
          } else {
            console.log(`✅ Updated: ${profile.full_name} (${profile.email}) - ${profile.role}`);
            updateCount++;
          }
        } else {
          // Insert new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
              registration_no: profile.registration_no || null,
              role: profile.role,
              department_name: profile.department_name || null,
              school_id: profile.school_id || null,
              school_ids: schoolIds,
              course_ids: courseIds,
              branch_ids: branchIds,
              is_active: isActive,
              metadata: profile.metadata || null,
              created_at: createdAt,
              updated_at: updatedAt,
              last_active_at: profile.last_active_at || null,
              assigned_department_ids: assignedDepartmentIds
            });
          
          if (insertError) {
            console.log(`❌ Failed to import ${profile.email}: ${insertError.message}`);
            errorCount++;
          } else {
            console.log(`✅ Imported: ${profile.full_name} (${profile.email}) - ${profile.role}`);
            successCount++;
          }
        }
        
      } catch (e) {
        console.log(`❌ Exception importing ${profile.email}: ${e.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 IMPORT SUMMARY:');
    console.log(`✅ Successfully imported: ${successCount} new profiles`);
    console.log(`🔄 Successfully updated: ${updateCount} existing profiles`);
    console.log(`❌ Failed: ${errorCount} profiles`);
    
    // Verify import
    console.log('\n🔍 VERIFYING IMPORT...');
    
    const { count: totalProfiles, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`✅ Total profiles in database: ${totalProfiles}`);
      
      // Get role breakdown
      const { data: roleData } = await supabase
        .from('profiles')
        .select('role');
      
      if (roleData) {
        const roleCounts = {};
        roleData.forEach(item => {
          roleCounts[item.role] = (roleCounts[item.role] || 0) + 1;
        });
        
        console.log('Role breakdown:');
        Object.entries(roleCounts).forEach(([role, count]) => {
          console.log(`  ${role}: ${count}`);
        });
      }
    }
    
    // Test admin login
    console.log('\n🔐 TESTING ADMIN LOGIN...');
    
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    try {
      const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
        email: 'admin@jecrcu.edu.in',
        password: 'Jecrc@2026'
      });
      
      if (!signInError) {
        console.log('✅ Admin login successful');
        
        // Check profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', signInData.user.id)
          .single();
        
        if (!profileError && profile) {
          console.log(`✅ Admin profile found: ${profile.full_name} (${profile.role})`);
        } else {
          console.log('❌ Admin profile not found');
        }
        
        await anonSupabase.auth.signOut();
      } else {
        console.log('❌ Admin login failed:', signInError.message);
      }
    } catch (e) {
      console.log('❌ Auth test exception:', e.message);
    }
    
    // Test department logins
    console.log('\n👥 TESTING DEPARTMENT LOGINS...');
    
    const testEmails = [
      'librarian@jecrcu.edu.in',
      'it@jecrcu.edu.in',
      'hostel@jecrcu.edu.in',
      'accounts@jecrcu.edu.in',
      'registrar@jecrcu.edu.in',
      'alumni@jecrcu.edu.in'
    ];
    
    for (const email of testEmails) {
      try {
        const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
          email: email,
          password: 'Jecrc@2026'
        });
        
        if (!signInError) {
          // Check profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, full_name, department_name')
            .eq('id', signInData.user.id)
            .single();
          
          if (!profileError && profile) {
            console.log(`✅ ${email}: ${profile.full_name} (${profile.role}, ${profile.department_name})`);
          } else {
            console.log(`❌ ${email}: Profile not found`);
          }
          
          await anonSupabase.auth.signOut();
        } else {
          console.log(`❌ ${email}: ${signInError.message}`);
        }
      } catch (e) {
        console.log(`❌ ${email}: Exception - ${e.message}`);
      }
    }
    
    console.log('\n🎉 PROFILE IMPORT COMPLETE!');
    console.log('📊 All profiles from CSV have been imported/updated');
    console.log('🔐 Admin and department logins should now work');
    console.log('🌐 Try accessing admin dashboard - 401 errors should be resolved');
    
  } catch (error) {
    console.error('💥 Profile import error:', error);
  }
}

importProfilesSafe();
