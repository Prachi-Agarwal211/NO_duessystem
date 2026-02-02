// Check department login passwords
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

async function checkDepartmentPasswords() {
  try {
    console.log('🔍 CHECKING DEPARTMENT LOGIN PASSWORDS...\n');
    
    // Check profiles table for department users
    console.log('📋 CHECKING PROFILES TABLE:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'department')
      .order('full_name');
    
    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError.message);
    } else {
      console.log(`Found ${profiles.length} department profiles:`);
      profiles.forEach(profile => {
        console.log(`\n👤 ${profile.full_name}`);
        console.log(`   Email: ${profile.email}`);
        console.log(`   Department: ${profile.department_name}`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Active: ${profile.is_active}`);
        console.log(`   Assigned Departments: ${JSON.stringify(profile.assigned_department_ids)}`);
        console.log(`   School IDs: ${JSON.stringify(profile.school_ids)}`);
        console.log(`   Course IDs: ${JSON.stringify(profile.course_ids)}`);
        console.log(`   Branch IDs: ${JSON.stringify(profile.branch_ids)}`);
      });
    }
    
    // Check if there's a separate users table
    console.log('\n📋 CHECKING USERS TABLE:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'department');
    
    if (usersError) {
      console.log('ℹ️  No users table or no department users found');
    } else {
      console.log(`Found ${users.length} department users:`);
      users.forEach(user => {
        console.log(`\n👤 ${user.name || user.full_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Department: ${user.department || user.department_name}`);
      });
    }
    
    // Check departments table for any password info
    console.log('\n📋 CHECKING DEPARTMENTS TABLE:');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error getting departments:', deptError.message);
    } else {
      console.log(`Found ${departments.length} departments:`);
      departments.forEach(dept => {
        console.log(`\n🏢 ${dept.display_name}`);
        console.log(`   Email: ${dept.email}`);
        console.log(`   Active: ${dept.is_active}`);
        
        // Check for any password-related fields
        Object.entries(dept).forEach(([key, value]) => {
          if (key.toLowerCase().includes('password') || key.toLowerCase().includes('pass') || key.toLowerCase().includes('auth')) {
            console.log(`   ${key}: ${value}`);
          }
        });
      });
    }
    
    // Look for any authentication-related tables
    console.log('\n🔍 LOOKING FOR AUTH TABLES:');
    
    const commonAuthTables = [
      'auth_users',
      'admin_users', 
      'department_users',
      'staff_users',
      'login_credentials',
      'authentication'
    ];
    
    for (const tableName of commonAuthTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data) {
          console.log(`✅ Found table: ${tableName}`);
          
          // Get all records if it's a small table
          const { data: allRecords } = await supabase
            .from(tableName)
            .select('*');
          
          console.log(`   Records: ${allRecords.length}`);
          allRecords.slice(0, 2).forEach(record => {
            console.log(`   Sample: ${JSON.stringify(record, null, 2).substring(0, 200)}...`);
          });
        }
      } catch (e) {
        // Table doesn't exist or no access
      }
    }
    
    console.log('\n🎯 DEPARTMENT PASSWORD ANALYSIS COMPLETE!');
    console.log('📊 Check the output above for login credentials');
    
  } catch (error) {
    console.error('💥 Error checking department passwords:', error);
  }
}

checkDepartmentPasswords();
