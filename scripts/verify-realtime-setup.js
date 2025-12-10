#!/usr/bin/env node

/**
 * VERIFY REALTIME SETUP IN SUPABASE
 * 
 * This script checks if realtime is properly enabled for no_dues_forms and no_dues_status tables
 * 
 * Usage: node scripts/verify-realtime-setup.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     SUPABASE REALTIME VERIFICATION                     ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function verifyRealtimeSetup() {
  const results = {
    success: [],
    warnings: [],
    errors: []
  };

  try {
    // 1. Check if tables exist
    console.log('1️⃣  Checking if tables exist...');
    
    const { data: formsCheck, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('id')
      .limit(1);
    
    if (formsError) {
      results.errors.push('❌ no_dues_forms table not found or not accessible');
    } else {
      results.success.push('✅ no_dues_forms table exists');
    }

    const { data: statusCheck, error: statusError } = await supabase
      .from('no_dues_status')
      .select('id')
      .limit(1);
    
    if (statusError) {
      results.errors.push('❌ no_dues_status table not found or not accessible');
    } else {
      results.success.push('✅ no_dues_status table exists');
    }

    // 2. Check replica identity (required for realtime)
    console.log('\n2️⃣  Checking replica identity settings...');
    
    const { data: replicaData, error: replicaError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          c.relname as table_name,
          CASE c.relreplident
            WHEN 'd' THEN 'default'
            WHEN 'n' THEN 'nothing'
            WHEN 'f' THEN 'full'
            WHEN 'i' THEN 'index'
          END as replica_identity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
        AND c.relname IN ('no_dues_forms', 'no_dues_status')
        ORDER BY c.relname;
      `
    });

    if (replicaError) {
      results.warnings.push('⚠️  Unable to check replica identity (requires admin access)');
      console.log('   Note: Replica identity should be FULL for both tables');
    } else {
      console.log('   Replica Identity Status:');
      replicaData?.forEach(row => {
        if (row.replica_identity === 'full') {
          results.success.push(`✅ ${row.table_name} has replica identity FULL`);
          console.log(`   ✅ ${row.table_name}: ${row.replica_identity.toUpperCase()}`);
        } else {
          results.errors.push(`❌ ${row.table_name} replica identity is ${row.replica_identity} (should be FULL)`);
          console.log(`   ❌ ${row.table_name}: ${row.replica_identity.toUpperCase()} (should be FULL)`);
        }
      });
    }

    // 3. Test realtime subscription
    console.log('\n3️⃣  Testing realtime subscription...');
    
    let subscriptionWorking = false;
    const testTimeout = 5000; // 5 seconds

    const channel = supabase
      .channel('test_realtime_verification')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'no_dues_forms'
        },
        (payload) => {
          subscriptionWorking = true;
          console.log('   ✅ Realtime subscription callback working!');
        }
      )
      .subscribe((status) => {
        console.log(`   📡 Subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          results.success.push('✅ Successfully subscribed to realtime channel');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          results.errors.push(`❌ Subscription failed with status: ${status}`);
        }
      });

    // Wait for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check subscription status
    if (channel.state === 'joined') {
      results.success.push('✅ Realtime channel joined successfully');
    } else {
      results.warnings.push(`⚠️  Channel state: ${channel.state} (expected: joined)`);
    }

    // Cleanup
    await supabase.removeChannel(channel);

    // 4. Check publication (if we have access)
    console.log('\n4️⃣  Checking publication configuration...');
    
    const { data: pubData, error: pubError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.pubname,
          array_agg(pt.schemaname || '.' || pt.tablename) as tables
        FROM pg_publication p
        LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
        WHERE p.pubname = 'supabase_realtime'
        GROUP BY p.pubname;
      `
    });

    if (pubError) {
      results.warnings.push('⚠️  Unable to check publication (requires admin access)');
      console.log('   Note: Tables should be added to supabase_realtime publication');
    } else {
      if (pubData && pubData.length > 0) {
        const tables = pubData[0].tables || [];
        const hasFormsTable = tables.some(t => t.includes('no_dues_forms'));
        const hasStatusTable = tables.some(t => t.includes('no_dues_status'));

        if (hasFormsTable) {
          results.success.push('✅ no_dues_forms added to publication');
        } else {
          results.errors.push('❌ no_dues_forms NOT in publication');
        }

        if (hasStatusTable) {
          results.success.push('✅ no_dues_status added to publication');
        } else {
          results.errors.push('❌ no_dues_status NOT in publication');
        }
      }
    }

  } catch (error) {
    results.errors.push(`❌ Verification failed: ${error.message}`);
    console.error('\n❌ Error:', error.message);
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (results.success.length > 0) {
    console.log('✅ PASSED:');
    results.success.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    results.warnings.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log('❌ ERRORS:');
    results.errors.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }

  // Overall status
  console.log('═══════════════════════════════════════════════════════════');
  if (results.errors.length === 0) {
    console.log('✅ REALTIME IS PROPERLY CONFIGURED!\n');
    console.log('📝 How to verify in Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to Database → Replication');
    console.log('   4. Check if "supabase_realtime" publication exists');
    console.log('   5. Verify no_dues_forms and no_dues_status are in the list\n');
    return true;
  } else {
    console.log('❌ REALTIME SETUP INCOMPLETE!\n');
    console.log('🔧 TO FIX: Run this SQL in Supabase SQL Editor:');
    console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE public.no_dues_forms;');
    console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE public.no_dues_status;');
    console.log('   ALTER TABLE public.no_dues_forms REPLICA IDENTITY FULL;');
    console.log('   ALTER TABLE public.no_dues_status REPLICA IDENTITY FULL;\n');
    return false;
  }
}

// Run verification
verifyRealtimeSetup()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });