/**
 * Add MBA-IT and Data Analytics branch to MBA course
 * 
 * This script adds 1 new branch to the MBA course in Jaipur School of Business
 * 
 * NEW BRANCH:
 * - MBA-IT and Data Analytics
 * 
 * Usage: 
 *   Dry-run: node scripts/add-mba-it-branch.js --dry-run
 *   Execute: node scripts/add-mba-it-branch.js
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

const NEW_BRANCH = 'MBA-IT and Data Analytics';
const SCHOOL_NAME = 'Jaipur School of Business';
const COURSE_NAME = 'MBA';

async function validateEnvironment() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables. Check .env.local file.');
  }
}

async function findCourse() {
  console.log('🔍 Finding MBA course...\n');
  
  // Get school
  const { data: school, error: schoolError } = await supabase
    .from('config_schools')
    .select('id, name')
    .eq('name', SCHOOL_NAME)
    .single();
  
  if (schoolError || !school) {
    throw new Error(`School "${SCHOOL_NAME}" not found in database`);
  }
  
  console.log(`   ✅ School found: ${SCHOOL_NAME}`);
  console.log(`      ID: ${school.id}\n`);
  
  // Get MBA course
  const { data: course, error: courseError } = await supabase
    .from('config_courses')
    .select('id, name')
    .eq('school_id', school.id)
    .eq('name', COURSE_NAME)
    .single();
  
  if (courseError || !course) {
    throw new Error(`Course "${COURSE_NAME}" not found in "${SCHOOL_NAME}"`);
  }
  
  console.log(`   ✅ Course found: ${COURSE_NAME}`);
  console.log(`      ID: ${course.id}\n`);
  
  return course;
}

async function getCurrentBranches(courseId) {
  console.log('📊 Current MBA branches:\n');
  
  const { data: branches, error } = await supabase
    .from('config_branches')
    .select('id, name, display_order')
    .eq('course_id', courseId)
    .order('display_order');
  
  if (error) throw error;
  
  console.log(`   Total branches: ${branches.length}\n`);
  
  branches.forEach((b, idx) => {
    console.log(`   ${idx + 1}. ${b.name} (order: ${b.display_order})`);
  });
  
  console.log('');
  return branches;
}

async function checkDuplicate(courseId) {
  console.log('🔍 Checking for duplicate...\n');
  
  const { data: existing, error } = await supabase
    .from('config_branches')
    .select('id, name')
    .eq('course_id', courseId)
    .eq('name', NEW_BRANCH)
    .single();
  
  if (existing) {
    console.log(`   ⚠️  Branch "${NEW_BRANCH}" already exists!`);
    return true;
  }
  
  console.log(`   ✅ No duplicate found - safe to add\n`);
  return false;
}

async function addBranch(courseId, existingBranches) {
  console.log('📝 Adding new branch...\n');
  
  if (isDryRun) {
    console.log(`   ℹ️  DRY-RUN: Would add "${NEW_BRANCH}" at position 1`);
    console.log(`   ℹ️  DRY-RUN: Would shift ${existingBranches.length} existing branches down by 1`);
    return { success: true, added: 1, dryRun: true };
  }
  
  try {
    // Step 1: Shift existing branches down
    if (existingBranches.length > 0) {
      console.log(`   📦 Shifting ${existingBranches.length} existing branches down by 1...`);
      
      for (let i = existingBranches.length - 1; i >= 0; i--) {
        const branch = existingBranches[i];
        const { error: updateErr } = await supabase
          .from('config_branches')
          .update({ 
            display_order: branch.display_order + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', branch.id);
        
        if (updateErr) throw updateErr;
      }
      
      console.log(`   ✅ Shifted existing branches\n`);
    }
    
    // Step 2: Insert new branch at top
    console.log(`   📝 Inserting "${NEW_BRANCH}" at position 1...`);
    
    const { data: newBranch, error: insertError } = await supabase
      .from('config_branches')
      .insert([{
        course_id: courseId,
        name: NEW_BRANCH,
        display_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    console.log(`   ✅ Branch added successfully!`);
    console.log(`      ID: ${newBranch.id}\n`);
    
    return { success: true, added: 1, branchId: newBranch.id };
    
  } catch (error) {
    console.error(`   ❌ Error adding branch:`, error.message);
    throw error;
  }
}

async function verifyAddition(courseId) {
  console.log('🔍 Verifying addition...\n');
  
  const { data: branches, error } = await supabase
    .from('config_branches')
    .select('name, display_order')
    .eq('course_id', courseId)
    .order('display_order')
    .limit(5);
  
  if (error) throw error;
  
  console.log('   📋 Top 5 branches after update:\n');
  branches.forEach(b => {
    const isNew = b.name === NEW_BRANCH;
    console.log(`      ${b.display_order}. ${b.name}${isNew ? ' ✨ NEW' : ''}`);
  });
  
  console.log('');
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          Add MBA-IT and Data Analytics Branch                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  if (isDryRun) {
    console.log('🔔 DRY-RUN MODE: No changes will be made to the database\n');
  } else {
    console.log('⚠️  LIVE MODE: Changes will be applied to the database\n');
  }
  
  try {
    // Step 1: Validate environment
    await validateEnvironment();
    console.log('✅ Environment variables validated\n');
    
    // Step 2: Find MBA course
    const course = await findCourse();
    
    // Step 3: Get current branches
    const existingBranches = await getCurrentBranches(course.id);
    
    // Step 4: Check for duplicate
    const isDuplicate = await checkDuplicate(course.id);
    
    if (isDuplicate) {
      console.log('\n⚠️  Branch already exists. No changes made.\n');
      return;
    }
    
    if (isDryRun) {
      console.log('═'.repeat(70));
      console.log('\n✅ DRY-RUN COMPLETE\n');
      console.log('📋 Summary of changes that would be made:\n');
      console.log(`   School: ${SCHOOL_NAME}`);
      console.log(`   Course: ${COURSE_NAME}`);
      console.log(`   Current branches: ${existingBranches.length}`);
      console.log(`   New branch to add: "${NEW_BRANCH}"`);
      console.log(`   Final branch count: ${existingBranches.length + 1}`);
      console.log(`   Position: Top of the list (display_order: 1)`);
      console.log('\n💡 Run without --dry-run flag to apply these changes\n');
      return;
    }
    
    // Step 5: Add the branch
    const result = await addBranch(course.id, existingBranches);
    
    // Step 6: Verify
    await verifyAddition(course.id);
    
    // Print summary
    console.log('═'.repeat(70));
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                     OPERATION SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ Successfully Added Branch:\n');
    console.log(`   School: ${SCHOOL_NAME}`);
    console.log(`   Course: ${COURSE_NAME}`);
    console.log(`   Branch: ${NEW_BRANCH}`);
    console.log(`   Position: Top of the list`);
    console.log(`   Before: ${existingBranches.length} branches`);
    console.log(`   After: ${existingBranches.length + 1} branches`);
    
    console.log('\n✅ Branch addition complete!');
    console.log('🎯 MBA-IT and Data Analytics branch is now available\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nStack trace:', error.stack);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check .env.local file exists in project root');
    console.error('  2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
    console.error('  3. Verify SUPABASE_SERVICE_ROLE_KEY is set');
    console.error('  4. Ensure Jaipur School of Business and MBA course exist');
    console.error('  5. Check Supabase project is active and accessible\n');
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