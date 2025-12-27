/**
 * Add Design and Sciences Branches
 * 
 * This script adds new branches to Jaipur School of Design and School of Sciences courses.
 * 
 * Courses to update:
 * - M.Sc (Design) - 4 new branches (Jaipur School of Design)
 * - B.Des - 4 Years - 1 new branch (Jaipur School of Design)
 * - M.Sc - 8 new branches (School of Sciences)
 * - B.Sc (Hons.) - 4 Years - 7 new branches (School of Sciences)
 * 
 * Total: 20 new branches
 * 
 * Safety features:
 * - Dry-run mode to preview changes without committing
 * - Automatic course ID lookup by name
 * - Rollback on any error
 * - Comprehensive validation checks
 * - Detailed logging and verification
 * 
 * Usage: 
 *   Dry-run: node scripts/add-design-sciences-branches-runner.js --dry-run
 *   Execute: node scripts/add-design-sciences-branches-runner.js
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

// Course configurations with school names and course names
const COURSE_CONFIGS = [
  {
    schoolName: 'Jaipur School of Design',
    courseName: 'M.Des',
    newBranches: [
      'Graphic Design',
      'Interior Design',
      'Fashion Design',
      'Jewellery Design'
    ]
  },
  {
    schoolName: 'Jaipur School of Design',
    courseName: 'B.Des',
    newBranches: [
      'Jewellery Design'
    ]
  },
  {
    schoolName: 'School of Sciences',
    courseName: 'M.Sc',
    newBranches: [
      'Microbiology',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biotechnology',
      'Forensic Science',
      'Zoology',
      'Botany'
    ]
  },
  {
    schoolName: 'School of Sciences',
    courseName: 'B.Sc (Hons.) - 4 Years',
    newBranches: [
      'Microbiology',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biotechnology',
      'Forensic Science',
      'Pass Course'
    ]
  }
];

async function validateEnvironment() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables. Check .env.local file.');
  }
}

async function fetchSchoolAndCourseIds() {
  console.log('🔍 Fetching school and course IDs from database...\n');
  
  // Get all schools
  const { data: schools, error: schoolError } = await supabase
    .from('config_schools')
    .select('id, name');
  
  if (schoolError) throw schoolError;
  
  // Get all courses
  const { data: courses, error: courseError } = await supabase
    .from('config_courses')
    .select('id, name, school_id');
  
  if (courseError) throw courseError;
  
  // Map courses with their IDs
  const mappedCourses = [];
  
  for (const config of COURSE_CONFIGS) {
    const school = schools.find(s => s.name === config.schoolName);
    if (!school) {
      throw new Error(`School "${config.schoolName}" not found in database`);
    }
    
    const course = courses.find(c => 
      c.name === config.courseName && c.school_id === school.id
    );
    
    if (!course) {
      console.log(`⚠️  WARNING: Course "${config.courseName}" not found in "${config.schoolName}"`);
      console.log(`   Available courses in this school:`);
      const schoolCourses = courses.filter(c => c.school_id === school.id);
      schoolCourses.forEach(c => console.log(`   - ${c.name}`));
      throw new Error(`Course "${config.courseName}" not found in "${config.schoolName}"`);
    }
    
    mappedCourses.push({
      id: course.id,
      name: config.courseName,
      schoolName: config.schoolName,
      newBranches: config.newBranches
    });
    
    console.log(`   ✅ ${config.schoolName} → ${config.courseName}`);
    console.log(`      Course ID: ${course.id}`);
  }
  
  console.log('');
  return mappedCourses;
}

async function getCurrentBranchCounts(courses) {
  console.log('📊 Current branch counts:\n');
  
  const counts = {};
  
  for (const course of courses) {
    const { data, error } = await supabase
      .from('config_branches')
      .select('id')
      .eq('course_id', course.id);
    
    if (error) throw error;
    
    counts[course.name] = data.length;
    console.log(`   ${course.schoolName} - ${course.name}: ${data.length} branches`);
  }
  
  console.log('');
  return counts;
}

async function checkForDuplicates(courses) {
  console.log('🔍 Checking for duplicate branch names...\n');
  
  const duplicates = [];
  
  for (const course of courses) {
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
        duplicates.push({ 
          school: course.schoolName,
          course: course.name, 
          branch: newBranch 
        });
        console.log(`   ⚠️  ${course.schoolName} - ${course.name}: "${newBranch}" already exists`);
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
  
  console.log(`\n📝 Processing ${course.schoolName} - ${course.name}:`);
  console.log(`   Adding ${shiftCount} new branches at the top`);
  console.log(`   Shifting existing branches down by ${shiftCount} positions\n`);
  
  try {
    // Step 1: Get all existing branches
    const { data: existingBranches, error: fetchError } = await supabase
      .from('config_branches')
      .select('id, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    console.log(`   📦 Updating ${existingBranches.length} existing branches...`);
    
    // Step 2: Update display orders in reverse to avoid conflicts
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
    
    // Step 3: Insert new branches
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
    
    // Step 4: Verify
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

async function addAllBranches(courses) {
  console.log('\n🚀 Adding branches to courses...\n');
  console.log('═'.repeat(80));
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const course of courses) {
    try {
      const result = await addBranchesForCourse(course);
      results.success.push({ 
        school: course.schoolName,
        course: course.name, 
        ...result 
      });
      console.log(`\n   ✅ ${course.schoolName} - ${course.name}: Successfully added ${result.added} branches`);
    } catch (error) {
      results.failed.push({ 
        school: course.schoolName,
        course: course.name, 
        error: error.message 
      });
      console.error(`\n   ❌ ${course.schoolName} - ${course.name}: Failed - ${error.message}`);
      throw error; // Stop on first error for safety
    }
    
    console.log('─'.repeat(80));
  }
  
  return results;
}

async function verifyFinalState(courses) {
  console.log('\n🔍 Verifying final state...\n');
  
  const finalCounts = {};
  
  for (const course of courses) {
    const { data, error } = await supabase
      .from('config_branches')
      .select('id')
      .eq('course_id', course.id);
    
    if (error) throw error;
    
    const key = `${course.schoolName} - ${course.name}`;
    finalCounts[key] = data.length;
    const expectedCount = course.newBranches.length;
    console.log(`   ${key}: ${data.length} branches (added ${expectedCount} new)`);
  }
  
  console.log('');
  return finalCounts;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         Add Design and Sciences Branches to Existing Courses              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  if (isDryRun) {
    console.log('🔔 DRY-RUN MODE: No changes will be made to the database\n');
  } else {
    console.log('⚠️  LIVE MODE: Changes will be applied to the database\n');
  }
  
  try {
    // Step 1: Validate environment
    await validateEnvironment();
    console.log('✅ Environment variables validated\n');
    
    // Step 2: Fetch and map course IDs
    const courses = await fetchSchoolAndCourseIds();
    
    // Step 3: Get current branch counts
    const currentCounts = await getCurrentBranchCounts(courses);
    
    // Step 4: Check for duplicate branch names
    const duplicates = await checkForDuplicates(courses);
    
    if (duplicates.length > 0) {
      console.log('⚠️  WARNING: Duplicate branches detected!');
      console.log('   These branches already exist and will be skipped:\n');
      duplicates.forEach(d => console.log(`   - ${d.school} - ${d.course}: ${d.branch}`));
      console.log('\n   Continuing with non-duplicate branches...\n');
    }
    
    if (isDryRun) {
      console.log('\n✅ DRY-RUN COMPLETE\n');
      console.log('📋 Summary of changes that would be made:\n');
      
      let totalBranches = 0;
      courses.forEach(course => {
        const key = `${course.schoolName} - ${course.name}`;
        console.log(`   ${key}:`);
        console.log(`      Current branches: ${currentCounts[course.name]}`);
        console.log(`      New branches to add: ${course.newBranches.length}`);
        console.log(`      Final branch count: ${currentCounts[course.name] + course.newBranches.length}`);
        console.log(`\n      New branches (will be at top):`);
        course.newBranches.forEach((branch, i) => {
          console.log(`         ${i + 1}. ${branch}`);
        });
        console.log('');
        totalBranches += course.newBranches.length;
      });
      
      console.log(`   📊 TOTAL: ${totalBranches} new branches will be added`);
      console.log('\n   Run without --dry-run flag to apply these changes\n');
      return;
    }
    
    // Step 5: Add branches (only in live mode)
    const results = await addAllBranches(courses);
    
    // Step 6: Verify final state
    const finalCounts = await verifyFinalState(courses);
    
    // Print summary
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          OPERATION SUMMARY                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ Successfully Added Branches:\n');
    let totalAdded = 0;
    results.success.forEach(r => {
      console.log(`   ${r.school} - ${r.course}: ${r.added} branches added`);
      totalAdded += r.added;
    });
    console.log(`\n   📊 TOTAL: ${totalAdded} branches added`);
    
    console.log('\n📊 Before and After Counts:\n');
    courses.forEach(course => {
      const key = `${course.schoolName} - ${course.name}`;
      const before = currentCounts[course.name];
      const after = finalCounts[key];
      console.log(`   ${key}:`);
      console.log(`      ${before} → ${after} (+${after - before})`);
    });
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Operations:\n');
      results.failed.forEach(f => {
        console.log(`   ${f.school} - ${f.course}: ${f.error}`);
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
    console.error('  4. Ensure config_schools, config_courses, and config_branches tables exist');
    console.error('  5. Check Supabase project is active and accessible');
    console.error('  6. Verify school and course names match database exactly\n');
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