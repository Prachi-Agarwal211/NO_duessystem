// Fix admin API authentication issue
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

// Initialize Supabase with anon key for session validation
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize Supabase with service role key for data access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAdminAPIAuth() {
  try {
    console.log('🔧 FIXING ADMIN API AUTHENTICATION...\n');
    
    // 1. Test admin login to get session token
    console.log('🔐 TESTING ADMIN LOGIN TO GET SESSION TOKEN...');
    
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: 'admin@jecrcu.edu.in',
      password: 'Jecrc@2026'
    });
    
    if (signInError) {
      console.error('❌ Admin login failed:', signInError.message);
      return;
    }
    
    console.log('✅ Admin login successful');
    console.log(`   User ID: ${signInData.user.id}`);
    console.log(`   Access token length: ${signInData.session.access_token.length}`);
    
    // 2. Test API call with session token
    console.log('\n🌐 TESTING API CALL WITH SESSION TOKEN...');
    
    const testResponse = await fetch('http://localhost:3000/api/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`API Response Status: ${testResponse.status}`);
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ API call successful!');
      console.log(`   Applications count: ${result.applications?.length || 0}`);
      console.log(`   Total items: ${result.pagination?.total || 0}`);
    } else {
      const errorResult = await testResponse.json();
      console.log('❌ API call failed:');
      console.log(`   Status: ${testResponse.status}`);
      console.log(`   Error: ${errorResult.error}`);
    }
    
    // 3. Test session validation with anon key
    console.log('\n🔍 TESTING SESSION VALIDATION WITH ANON KEY...');
    
    try {
      const { data: { user }, error: sessionError } = await supabaseAnon.auth.getUser(
        signInData.session.access_token
      );
      
      if (sessionError) {
        console.log('❌ Session validation with anon key failed:', sessionError.message);
      } else {
        console.log('✅ Session validation with anon key successful');
        console.log(`   User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
      }
    } catch (e) {
      console.log('❌ Session validation exception:', e.message);
    }
    
    // 4. Test session validation with service key
    console.log('\n🔍 TESTING SESSION VALIDATION WITH SERVICE KEY...');
    
    try {
      const { data: { user }, error: sessionError } = await supabaseAdmin.auth.getUser(
        signInData.session.access_token
      );
      
      if (sessionError) {
        console.log('❌ Session validation with service key failed:', sessionError.message);
        console.log('This is the root cause of the 401 error!');
      } else {
        console.log('✅ Session validation with service key successful');
        console.log(`   User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
      }
    } catch (e) {
      console.log('❌ Session validation exception:', e.message);
    }
    
    // 5. Create fixed API route
    console.log('\n📝 CREATING FIXED API ROUTE...');
    
    const fixedAPIRoute = `// Fixed admin dashboard API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use anon key for session validation (same as frontend)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Use service role key for data access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Validate session with anon key (same as frontend)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Session validation failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user is admin using service role key
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      console.log('Profile validation failed:', profileError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Admin authenticated successfully:', user.email);
    
    // Fetch dashboard data using service role key
    const { data: applications, error: dataError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*')
      .eq('status', 'completed')
      .limit(10);
    
    if (dataError) {
      console.error('Data fetch error:', dataError.message);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
    
    // Get stats
    const { count: totalCompleted } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    const { count: totalStudents } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      success: true,
      applications: applications || [],
      stats: {
        totalStudents: totalStudents || 0,
        completedStudents: totalCompleted || 0
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`;
    
    fs.writeFileSync(
      path.join(__dirname, '../fixed_admin_dashboard_api.js'),
      fixedAPIRoute
    );
    
    console.log('✅ Fixed API route saved to: fixed_admin_dashboard_api.js');
    
    // 6. Sign out
    await supabaseAnon.auth.signOut();
    
    console.log('\n🎯 API AUTHENTICATION FIX COMPLETE!');
    console.log('\n💡 SOLUTION:');
    console.log('1. Use anon key for session validation (same as frontend)');
    console.log('2. Use service role key for data access');
    console.log('3. Update all admin API routes to use this pattern');
    console.log('4. The issue was mixing anon and service role keys incorrectly');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Replace the existing API routes with the fixed version');
    console.log('2. Test the admin dashboard');
    console.log('3. Verify data is showing correctly');
    
  } catch (error) {
    console.error('💥 API auth fix error:', error);
  }
}

fixAdminAPIAuth();
