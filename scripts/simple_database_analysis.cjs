// Simple database analysis - understand actual structure
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

async function simpleDatabaseAnalysis() {
  try {
    console.log('🔍 SIMPLE DATABASE ANALYSIS...\n');
    
    // 1. Test key tables that should exist
    const keyTables = [
      'no_dues_forms',
      'profiles', 
      'departments',
      'config_schools',
      'config_courses',
      'config_branches',
      'no_dues_status'
    ];
    
    console.log('📋 TESTING KEY TABLES...');
    
    for (const tableName of keyTables) {
      console.log(`\n📊 TABLE: ${tableName}`);
      
      try {
        // Try to get count first
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.log(`  ❌ Table not accessible: ${countError.message}`);
        } else {
          console.log(`  ✅ Table exists with ${count} rows`);
          
          // Get sample data
          const { data: sample, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!sampleError && sample && sample.length > 0) {
            console.log(`  📄 Sample columns: ${Object.keys(sample[0]).join(', ')}`);
            
            // Show sample values
            const row = sample[0];
            Object.entries(row).forEach(([key, value]) => {
              const displayValue = typeof value === 'string' && value.length > 30 
                ? value.substring(0, 30) + '...' 
                : value;
              console.log(`    ${key}: ${displayValue}`);
            });
          } else {
            console.log(`  ℹ️  No sample data: ${sampleError?.message || 'Empty table'}`);
          }
        }
      } catch (e) {
        console.log(`  ❌ Error: ${e.message}`);
      }
    }
    
    // 2. Check current data status
    console.log('\n📊 CURRENT DATA STATUS...');
    
    try {
      const { count: totalForms, error: totalError } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true });
      
      if (!totalError) {
        console.log(`Total no_dues_forms: ${totalForms}`);
        
        // Get status breakdown
        const { data: statusData } = await supabase
          .from('no_dues_forms')
          .select('status');
        
        if (statusData) {
          const statusCounts = {};
          statusData.forEach(item => {
            statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
          });
          
          console.log('Status breakdown:');
          Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
          });
        }
      }
      
      const { count: totalProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (!profileError) {
        console.log(`Total profiles: ${totalProfiles}`);
        
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
      
    } catch (e) {
      console.log('❌ Data status check failed:', e.message);
    }
    
    // 3. Check authentication
    console.log('\n🔐 CHECKING AUTHENTICATION...');
    
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    console.log('Testing admin login...');
    
    try {
      const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
        email: 'admin@jecrcu.edu.in',
        password: 'Jecrc@2026'
      });
      
      if (!signInError) {
        console.log('✅ Admin login successful');
        console.log(`  User ID: ${signInData.user.id}`);
        
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signInData.user.id)
          .single();
        
        if (!profileError && profile) {
          console.log('✅ Admin profile found');
          console.log(`  Role: ${profile.role}`);
          console.log(`  Name: ${profile.full_name}`);
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
    
    // 4. Test department users
    console.log('\n👥 TESTING DEPARTMENT USERS...');
    
    const departmentEmails = [
      'librarian@jecrcu.edu.in',
      'it@jecrcu.edu.in',
      'hostel@jecrcu.edu.in',
      'accounts@jecrcu.edu.in',
      'registrar@jecrcu.edu.in',
      'alumni@jecrcu.edu.in'
    ];
    
    for (const email of departmentEmails) {
      try {
        const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
          email: email,
          password: 'Jecrc@2026'
        });
        
        if (!signInError) {
          console.log(`✅ ${email}: Login successful`);
          
          // Check profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, department_name')
            .eq('id', signInData.user.id)
            .single();
          
          if (!profileError && profile) {
            console.log(`  Role: ${profile.role}, Department: ${profile.department_name}`);
          } else {
            console.log(`  Profile: Not found`);
          }
          
          await anonSupabase.auth.signOut();
        } else {
          console.log(`❌ ${email}: ${signInError.message}`);
        }
      } catch (e) {
        console.log(`❌ ${email}: Exception - ${e.message}`);
      }
    }
    
    console.log('\n🎯 SIMPLE ANALYSIS COMPLETE!');
    console.log('\n📋 This shows your ACTUAL database structure and data');
    
  } catch (error) {
    console.error('💥 Simple analysis error:', error);
  }
}

simpleDatabaseAnalysis();
