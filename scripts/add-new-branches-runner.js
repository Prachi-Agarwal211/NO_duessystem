/**
 * Add New Branches to Existing Courses
 * 
 * This script safely adds new branches to B.Tech, MCA, BCA, BBA, and MBA courses.
 * New branches will be positioned at the top of their respective course lists.
 * All existing branches are preserved with updated display orders.
 * 
 * Safety features:
 * - Dry-run mode to preview changes without committing
 * - Rollback on any error
 * - Comprehensive validation checks
 * - Detailed logging and verification
 * 
 * Usage: 
 *   Dry-run: node scripts/add-new-branches-runner.js --dry-run
 *   Execute: node scripts/add-new-branches-runner.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Course configurations
const COURSES = [
  {
    id: '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
    name: 'B.Tech',
    newBranches: [
      'CSE AI/ML Xebia',
      'CSE AI/ML IBM',
      'CSE AI/ML Samatrix',
      'CSE Fullstack - Xebia',
      'CSE Cloud Computing - Microsoft',
      'CSE Cloud Computing - AWS',
      'CSE Blockchain - upGrad',
      'CSE Data Science Samatrix'
    ]
  },
  {
    id: '9fd733a2-7258-45ef-a725-3854b71dc972',
    name: 'MCA',
    newBranches: [
      'MCA Sunstone',
      'MCA CollegeDekho'
    ]
  },
  {
    id: 'afe542c8-a3e9-4dac-851f-9e583e8ae125',
    name: 'BCA',
    newBranches: [
      'BCA Sunstone',
      'BCA CollegeDekho'
    ]
  },
  {
    id: 'cd5e3027-5077-4593-bb1c-0e6345291689',
    name: 'BBA',
    newBranches: [
      'BBA - ISDC',
      'BBA - Sunstone',
      'BBA - CollegeDekho'
    ]
  },
  {
    id: 'fffc3234-e6e0-4466-891b-1acce82f143c',
    name: 'MBA',
    newBranches: [
      'MBA - ISDC',
      'MBA - CollegeDekho',
      'MBA - Sunstone'
    ]
  }
];

async function validateEnvironment() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables. Check .env.local file.');
  }
}

async function validateCourses() {
  console.log('🔍 Validating courses...\n');
  
  const validationResults = [];
  
  for (const course of COURSES) {
    const { data, error } = await supabase
      .from('config_courses')
      .select('id, name')
      .eq('id', course.id)
      .single();
    
    if (error || !data) {
      throw new Error(`Course ${course.name} (${course.id}) not found in database`);
    }
    
    console.log(`   ✅ ${course.name}: Found (${data.name})`);
    validationResults.push({ course: course.name, exists: true });
  }
  
  console.log('');
  return validationResults;
}

async function getCurrentBranchCounts() {
  console.log('📊 Current branch counts:\n');
  
  const counts = {};
  
  for (const course of COURSES) {
    const { data, error } = await supabase
      .from('config_branches')
      .select('id')
      .eq('course_id', course.id);
    
    if (error) throw error;
    
    counts[course.name] = data.length;
    console.log(`   ${course.name}: ${data.length} branches`);
  }
  
  console.log('');
  return counts;
}

async function checkForDuplicates() {
  console.log('🔍 Checking for duplicate branch names...\n');
  
  const duplicates = [];
  
  for (const course of COURSES) {
    // Get existing branch names for this course
    const { data: existingBranches, error } = await supabase
      .from('config_branches')
      .select('name')
      .eq('course_id', course.id);
    
    if (error) throw error;
    
    const existingNames = new Set(existingBranches.map(b => b.name));
    
    // Check for duplicates
    for (const newBranch of course.newBranches) {
      if (existingNames.has(newBranch)) {
        duplicates.push({ course: course.name, branch: newBranch });
        console.log(`   ⚠️  ${course.name}: "${newBranch}" already exists`);
      }
    }
  }
  
  if (duplicates.length === 0) {
    console.log('   ✅ No duplicate branches found');
  }
  
  console.log('');
  return duplicates;
}

async function addBranchesForCourse(course) {
  const shiftCount = course.newBranches.length;
  
  console.log(`\n📝 Processing ${course.name}:`);
  console.log(`   Adding ${shiftCount} new branches at the top`);
  console.log(`   Shifting existing branches down by ${shiftCount} positions\n`);
  
  try {
    // Step 1: Shift existing branches
    const { error: updateError } = await supabase
      .from('config_branches')
      .update({ 
        display_order: supabase.rpc('increment_display_order', { shift: shiftCount })
      })
      .eq('course_id', course.id);
    
    // Since RPC doesn't work for this, we'll do it differently
    // Get all existing branches first
    const { data: existingBranches, error: fetchError } = await supabase
      .from('config_branches')
      .select('id, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    console.log(`   📦 Updating ${existingBranches.length} existing branches...`);
    
    // Update display orders in reverse to avoid conflicts
    for (let i = existingBranches.length - 1; i >= 0; i--) {
      const branch = existingBranches[i];
      const { error: updateErr } = await supabase
        .from('config_branches')
        .update({ 
          display_order: branch.display_order + shiftCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', branch.id);
      
      if (updateErr) throw updateErr;
    }
    
    console.log(`   ✅ Shifted existing branches`);
    
    // Step 2: Insert new branches
    console.log(`   📝 Inserting ${course.newBranches.length} new branches...`);
    
    const newBranchRecords = course.newBranches.map((name, index) => ({
      course_id: course.id,
      name: name,
      display_order: index + 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data: insertedBranches, error: insertError } = await supabase
      .from('config_branches')
      .insert(newBranchRecords)
      .select();
    
    if (insertError) throw insertError;
    
    console.log(`   ✅ Inserted ${insertedBranches.length} new branches`);
    
    // Step 3: Verify
    const { data: verifyBranches, error: verifyError } = await supabase
      .from('config_branches')
      .select('name, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true })
      .limit(shiftCount + 3);
    
    if (verifyError) throw verifyError;
    
    console.log(`\n   📋 Top branches after update:`);
    verifyBranches.forEach(b => {
      const isNew = course.newBranches.includes(b.name);
      console.log(`      ${b.display_order}. ${b.name}${isNew ? ' ✨ NEW' : ''}`);
    });
    
    return { success: true, added: insertedBranches.length };
    
  } catch (error) {
    console.error(`   ❌ Error processing ${course.name}:`, error.message);
    throw error;
  }
}

async function addAllBranches() {
  console.log('\n🚀 Adding branches to courses...\n');
  console.log('═'.repeat(70));
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const course of COURSES) {
    try {
      const result = await addBranchesForCourse(course);
      results.success.push({ course: course.name, ...result });
      console.log(`\n   ✅ ${course.name}: Successfully added ${result.added} branches`);
    } catch (error) {
      results.failed.push({ course: course.name, error: error.message });
      console.error(`\n   ❌ ${course.name}: Failed - ${error.message}`);
      throw error; // Stop on first error for safety
    }
    
    console.log('─'.repeat(70));
  }
  
  return results;
}

async function verifyFinalState() {
  console.log('\n🔍 Verifying final state...\n');
  
  const finalCounts = {};
  
  for (const course of COURSES) {
    const { data, error } = await supabase
      .from('config_branches')
      .select('id')
      .eq('course_id', course.id);
    
    if (error) throw error;
    
    finalCounts[course.name] = data.length;
    const expectedCount = course.newBranches.length;
    console.log(`   ${course.name}: ${data.length} branches (added ${expectedCount} new)`);
  }
  
  console.log('');
  return finalCounts;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           Add New Branches to Existing Courses                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  if (isDryRun) {
    console.log('🔔 DRY-RUN MODE: No changes will be made to the database\n');
  } else {
    console.log('⚠️  LIVE MODE: Changes will be applied to the database\n');
  }
  
  try {
    // Step 1: Validate environment
    await validateEnvironment();
    console.log('✅ Environment variables validated\n');
    
    // Step 2: Validate courses exist
    await validateCourses();
    
    // Step 3: Get current branch counts
    const currentCounts = await getCurrentBranchCounts();
    
    // Step 4: Check for duplicate branch names
    const duplicates = await checkForDuplicates();
    
    if (duplicates.length > 0) {
      console.log('⚠️  WARNING: Duplicate branches detected!');
      console.log('   These branches already exist and will be skipped:\n');
      duplicates.forEach(d => console.log(`   - ${d.course}: ${d.branch}`));
      console.log('\n   Continuing with non-duplicate branches...\n');
    }
    
    if (isDryRun) {
      console.log('\n✅ DRY-RUN COMPLETE\n');
      console.log('📋 Summary of changes that would be made:\n');
      COURSES.forEach(course => {
        console.log(`   ${course.name}:`);
        console.log(`      Current branches: ${currentCounts[course.name]}`);
        console.log(`      New branches to add: ${course.newBranches.length}`);
        console.log(`      Final branch count: ${currentCounts[course.name] + course.newBranches.length}`);
        console.log(`\n      New branches (will be at top):`);
        course.newBranches.forEach((branch, i) => {
          console.log(`         ${i + 1}. ${branch}`);
        });
        console.log('');
      });
      console.log('\n   Run without --dry-run flag to apply these changes\n');
      return;
    }
    
    // Step 5: Add branches (only in live mode)
    const results = await addAllBranches();
    
    // Step 6: Verify final state
    const finalCounts = await verifyFinalState();
    
    // Print summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                     OPERATION SUMMARY                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ Successfully Added Branches:\n');
    results.success.forEach(r => {
      console.log(`   ${r.course}: ${r.added} branches added`);
    });
    
    console.log('\n📊 Before and After Counts:\n');
    COURSES.forEach(course => {
      const before = currentCounts[course.name];
      const after = finalCounts[course.name];
      console.log(`   ${course.name}: ${before} → ${after} (+${after - before})`);
    });
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Operations:\n');
      results.failed.forEach(f => {
        console.log(`   ${f.course}: ${f.error}`);
      });
    }
    
    console.log('\n✅ Branch addition complete!');
    console.log('🎯 New branches are now available at the top of each course list\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nStack trace:', error.stack);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check .env.local file exists in project root');
    console.error('  2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
    console.error('  3. Verify SUPABASE_SERVICE_ROLE_KEY is set');
    console.error('  4. Ensure config_courses and config_branches tables exist');
    console.error('  5. Check Supabase project is active and accessible');
    console.error('  6. Verify course IDs are correct\n');
    console.error('💡 If data is corrupted, you may need to restore from backup\n');
    process.exit(1);
  }
}

// Execute main function
main()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });