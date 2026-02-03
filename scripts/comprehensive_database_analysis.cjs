// Comprehensive database analysis - understand actual structure
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

async function comprehensiveDatabaseAnalysis() {
  try {
    console.log('🔍 COMPREHENSIVE DATABASE ANALYSIS...\n');
    
    // 1. Get all tables
    console.log('📋 GETTING ALL TABLES...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .neq('table_name', '_realtime')
      .order('table_name');
    
    if (tablesError) {
      console.error('❌ Error getting tables:', tablesError.message);
      return;
    }
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`  ${table.table_name} (${table.table_type})`);
    });
    
    // 2. Analyze key tables structure
    const keyTables = [
      'no_dues_forms',
      'profiles', 
      'departments',
      'config_schools',
      'config_courses',
      'config_branches',
      'no_dues_status'
    ];
    
    console.log('\n🔍 ANALYZING KEY TABLE STRUCTURES...');
    
    for (const tableName of keyTables) {
      console.log(`\n📊 TABLE: ${tableName}`);
      
      try {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', tableName)
          .order('ordinal_position');
        
        if (!columnsError && columns) {
          console.log(`  Columns (${columns.length}):`);
          columns.forEach(col => {
            console.log(`    ${col.column_name}: ${col.data_type} (${col.is_nullable}) ${col.column_default ? `[${col.column_default}]` : ''}`);
          });
          
          // Get sample data
          try {
            const { data: sample, error: sampleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(2);
            
            if (!sampleError && sample.length > 0) {
              console.log('    Sample data:');
              sample.forEach((row, index) => {
                console.log(`      Row ${index + 1}:`);
                Object.entries(row).forEach(([key, value]) => {
                  const displayValue = typeof value === 'string' && value.length > 50 
                    ? value.substring(0, 50) + '...' 
                    : value;
                  console.log(`        ${key}: ${displayValue}`);
                });
              });
            } else {
              console.log(`    Sample: ${sampleError?.message || 'No data'}`);
            }
          } catch (e) {
            console.log(`    Sample: Cannot fetch - ${e.message}`);
          }
        } else {
          console.log('  Columns: Not found');
        }
        
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }
    
    // 3. Check current data status
    console.log('\n📊 CURRENT DATA STATUS...');
    
    try {
      const { count: totalForms, error: totalError } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true });
      
      if (!totalError) {
        console.log(`Total no_dues_forms: ${totalForms}`);
      }
      
      const { count: completedForms, error: completedError } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      if (!completedError) {
        console.log(`Completed no_dues_forms: ${completedForms}`);
      }
      
      const { count: totalProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (!profileError) {
        console.log(`Total profiles: ${totalProfiles}`);
      }
      
      const { count: adminProfiles, error: adminProfileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      
      if (!adminProfileError) {
        console.log(`Admin profiles: ${adminProfiles}`);
      }
      
    } catch (e) {
      console.log('❌ Data status check failed:', e.message);
    }
    
    // 4. Check authentication flow
    console.log('\n🔐 ANALYZING AUTHENTICATION FLOW...');
    
    // Test with both anon and service keys
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    console.log('Testing admin login with anon key...');
    
    try {
      const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
        email: 'admin@jecrcu.edu.in',
        password: 'Jecrc@2026'
      });
      
      if (!signInError) {
        console.log('✅ Anon key login successful');
        console.log(`  User ID: ${signInData.user.id}`);
        console.log(`  Access token length: ${signInData.session.access_token.length}`);
        
        // Test session validation with anon key
        const { data: { user }, error: sessionError } = await anonSupabase.auth.getUser(
          signInData.session.access_token
        );
        
        if (!sessionError) {
          console.log('✅ Session validation with anon key works');
        } else {
          console.log('❌ Session validation with anon key failed:', sessionError.message);
        }
        
        // Test session validation with service key
        const { data: { user: serviceUser }, error: serviceSessionError } = await supabase.auth.getUser(
          signInData.session.access_token
        );
        
        if (!serviceSessionError) {
          console.log('✅ Session validation with service key works');
        } else {
          console.log('❌ Session validation with service key failed:', serviceSessionError.message);
        }
        
        await anonSupabase.auth.signOut();
      } else {
        console.log('❌ Anon key login failed:', signInError.message);
      }
    } catch (e) {
      console.log('❌ Auth test exception:', e.message);
    }
    
    console.log('\n🎯 COMPREHENSIVE ANALYSIS COMPLETE!');
    console.log('\n📋 This analysis shows your ACTUAL database structure');
    console.log('📋 Now we can make informed decisions based on real data');
    
  } catch (error) {
    console.error('💥 Comprehensive analysis error:', error);
  }
}

comprehensiveDatabaseAnalysis();
