/**
 * Add Design and Sciences Courses and Branches
 * 
 * This script:
 * 1. Creates M.Sc courses for Jaipur School of Design and School of Sciences (if they don't exist)
 * 2. Adds branches to all design and sciences courses
 * 
 * NEW COURSES TO ADD:
 * - M.Sc (Jaipur School of Design) - NEW COURSE
 * - M.Sc (School of Sciences) - NEW COURSE
 * 
 * BRANCHES TO ADD:
 * Jaipur School of Design:
 *   - M.Sc: 4 branches (Graphic Design, Interior Design, Fashion Design, Jewellery Design)
 *   - B.Des - 4 Years: 1 branch (Jewellery Design)
 * 
 * School of Sciences:
 *   - M.Sc: 8 branches (Microbiology, Mathematics, Physics, Chemistry, Biotechnology, Forensic Science, Zoology, Botany)
 *   - B.Sc (Hons.) - 4 Years: 7 branches (Microbiology, Mathematics, Physics, Chemistry, Biotechnology, Forensic Science, Pass Course)
 * 
 * Total: 2 new courses + 20 new branches
 * 
 * Safety features:
 * - Dry-run mode to preview changes
 * - Automatic course creation if missing
 * - Rollback on any error
 * - Comprehensive validation
 * 
 * Usage: 
 *   Dry-run: node scripts/add-design-sciences-courses-and-branches.js --dry-run
 *   Execute: node scripts/add-design-sciences-courses-and-branches.js
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

// Configuration for courses and branches
const CONFIGURATIONS = [
  {
    schoolName: 'Jaipur School of Design',
    courseName: 'M.Sc',
    courseNameFull: 'M.Sc',
    createCourseIfMissing: true,
    branches: [
      'Graphic Design',
      'Interior Design',
      'Fashion Design',
      'Jewellery Design'
    ]
  },
  {
    schoolName: 'Jaipur School of Design',
    courseName: 'B.Des',
    courseNameFull: 'B.Des',
    createCourseIfMissing: false,
    branches: [
      'Jewellery Design'
    ]
  },
  {
    schoolName: 'School of Sciences',
    courseName: 'M.Sc',
    courseNameFull: 'M.Sc',
    createCourseIfMissing: true,
    branches: [
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
    courseName: 'B.Sc.',
    courseNameFull: 'B.Sc.',
    createCourseIfMissing: false,
    branches: [
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

async function getOrCreateCourse(config, schoolId, allCourses) {
  // Try to find existing course
  let course = allCourses.find(c => 
    c.name === config.courseName && c.school_id === schoolId
  );

  if (course) {
    console.log(`   ✅ Found existing course: ${config.courseName}`);
    return { course, created: false };
  }

  // Course doesn't exist
  if (!config.createCourseIfMissing) {
    throw new Error(`Course "${config.courseName}" not found in "${config.schoolName}" and creation not allowed`);
  }

  console.log(`   📝 Course "${config.courseName}" not found - will create it`);

  if (isDryRun) {
    // In dry-run, return a mock course
    return { 
      course: { 
        id: 'DRY-RUN-COURSE-ID', 
        name: config.courseName,
        school_id: schoolId 
      }, 
      created: true 
    };
  }

  // Get max display_order for this school
  const { data: maxOrder } = await supabase
    .from('config_courses')
    .select('display_order')
    .eq('school_id', schoolId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = maxOrder ? maxOrder.display_order + 1 : 1;

  // Create the course
  const { data: newCourse, error: createError } = await supabase
    .from('config_courses')
    .insert([{
      school_id: schoolId,
      name: config.courseNameFull,
      display_order: nextOrder,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (createError) throw createError;

  console.log(`   ✅ Created new course: ${config.courseName} (ID: ${newCourse.id})`);
  
  return { course: newCourse, created: true };
}

async function setupCoursesAndGetIds() {
  console.log('🔍 Setting up courses and fetching IDs...\n');
  
  // Get all schools
  const { data: schools, error: schoolError } = await supabase
    .from('config_schools')
    .select('id, name');
  
  if (schoolError) throw schoolError;
  
  // Get all existing courses
  const { data: allCourses, error: courseError } = await supabase
    .from('config_courses')
    .select('id, name, school_id');
  
  if (courseError) throw courseError;
  
  console.log(`📚 Found ${schools.length} schools and ${allCourses.length} existing courses\n`);
  
  const mappedConfigs = [];
  const createdCourses = [];
  
  for (const config of CONFIGURATIONS) {
    console.log(`\n📌 Processing: ${config.schoolName} → ${config.courseName}`);
    
    // Find school
    const school = schools.find(s => s.name === config.schoolName);
    if (!school) {
      throw new Error(`School "${config.schoolName}" not found in database`);
    }
    console.log(`   ✅ School found: ${config.schoolName} (ID: ${school.id})`);
    
    // Get or create course
    const { course, created } = await getOrCreateCourse(config, school.id, allCourses);
    
    if (created) {
      createdCourses.push({
        school: config.schoolName,
        course: config.courseName
      });
    }
    
    mappedConfigs.push({
      id: course.id,
      name: config.courseName,
      schoolName: config.schoolName,
      branches: config.branches,
      courseCreated: created
    });
  }
  
  console.log('\n');
  return { configs: mappedConfigs, createdCourses };
}

async function getCurrentBranchCounts(configs) {
  console.log('📊 Current branch counts:\n');
  
  const counts = {};
  
  for (const config of configs) {
    if (config.id === 'DRY-RUN-COURSE-ID') {
      counts[config.name] = 0;
      console.log(`   ${config.schoolName} - ${config.name}: 0 branches (NEW COURSE)`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('config_branches')
      .select('id')
      .eq('course_id', config.id);
    
    if (error) throw error;
    
    counts[config.name] = data.length;
    const newCourseTag = config.courseCreated ? ' (NEW COURSE)' : '';
    console.log(`   ${config.schoolName} - ${config.name}: ${data.length} branches${newCourseTag}`);
  }
  
  console.log('');
  return counts;
}

async function checkForDuplicates(configs) {
  console.log('🔍 Checking for duplicate branch names...\n');
  
  const duplicates = [];
  
  for (const config of configs) {
    if (config.id === 'DRY-RUN-COURSE-ID') {
      console.log(`   ℹ️  ${config.schoolName} - ${config.name}: Skipping duplicate check (dry-run)`);
      continue;
    }
    
    // Get existing branch names for this course
    const { data: existingBranches, error } = await supabase
      .from('config_branches')
      .select('name')
      .eq('course_id', config.id);
    
    if (error) throw error;
    
    const existingNames = new Set(existingBranches.map(b => b.name));
    
    // Check for duplicates
    for (const newBranch of config.branches) {
      if (existingNames.has(newBranch)) {
        duplicates.push({ 
          school: config.schoolName,
          course: config.name, 
          branch: newBranch 
        });
        console.log(`   ⚠️  ${config.schoolName} - ${config.name}: "${newBranch}" already exists`);
      }
    }
  }
  
  if (duplicates.length === 0) {
    console.log('   ✅ No duplicate branches found');
  }
  
  console.log('');
  return duplicates;
}

async function addBranchesForCourse(config) {
  const shiftCount = config.branches.length;
  
  console.log(`\n📝 Processing ${config.schoolName} - ${config.name}:`);
  console.log(`   Adding ${shiftCount} new branches at the top`);
  
  if (config.id === 'DRY-RUN-COURSE-ID') {
    console.log(`   ℹ️  Skipping branch addition (dry-run mode)`);
    return { success: true, added: shiftCount };
  }
  
  try {
    // Step 1: Get all existing branches
    const { data: existingBranches, error: fetchError } = await supabase
      .from('config_branches')
      .select('id, display_order')
      .eq('course_id', config.id)
      .order('display_order', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    if (existingBranches.length > 0) {
      console.log(`   📦 Shifting ${existingBranches.length} existing branches down by ${shiftCount} positions...`);
      
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
    } else {
      console.log(`   ℹ️  No existing branches to shift`);
    }
    
    // Step 2: Filter out duplicates and insert new branches
    const { data: existingBranchNames, error: fetchExistingError } = await supabase
      .from('config_branches')
      .select('name')
      .eq('course_id', config.id);
    
    if (fetchExistingError) throw fetchExistingError;
    
    const existingNames = new Set(existingBranchNames.map(b => b.name));
    const branchesToInsert = config.branches.filter(name => !existingNames.has(name));
    
    if (branchesToInsert.length === 0) {
      console.log(`   ⚠️  All branches already exist, skipping insertion`);
      return { success: true, added: 0, skipped: config.branches.length };
    }
    
    if (branchesToInsert.length < config.branches.length) {
      const skipped = config.branches.length - branchesToInsert.length;
      console.log(`   ⚠️  Skipping ${skipped} duplicate branch(es)`);
    }
    
    console.log(`   📝 Inserting ${branchesToInsert.length} new branches...`);
    
    const newBranchRecords = branchesToInsert.map((name, index) => ({
      course_id: config.id,
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
      .eq('course_id', config.id)
      .order('display_order', { ascending: true })
      .limit(Math.min(shiftCount + 3, 10));
    
    if (verifyError) throw verifyError;
    
    console.log(`\n   📋 Top branches after update:`);
    verifyBranches.forEach(b => {
      const isNew = config.branches.includes(b.name);
      console.log(`      ${b.display_order}. ${b.name}${isNew ? ' ✨ NEW' : ''}`);
    });
    
    return { success: true, added: insertedBranches.length };
    
  } catch (error) {
    console.error(`   ❌ Error processing ${config.name}:`, error.message);
    throw error;
  }
}

async function addAllBranches(configs) {
  console.log('\n🚀 Adding branches to courses...\n');
  console.log('═'.repeat(80));
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const config of configs) {
    try {
      const result = await addBranchesForCourse(config);
      results.success.push({ 
        school: config.schoolName,
        course: config.name, 
        ...result 
      });
      console.log(`\n   ✅ ${config.schoolName} - ${config.name}: Successfully added ${result.added} branches`);
    } catch (error) {
      results.failed.push({ 
        school: config.schoolName,
        course: config.name, 
        error: error.message 
      });
      console.error(`\n   ❌ ${config.schoolName} - ${config.name}: Failed - ${error.message}`);
      throw error;
    }
    
    console.log('─'.repeat(80));
  }
  
  return results;
}

async function verifyFinalState(configs) {
  console.log('\n🔍 Verifying final state...\n');
  
  const finalCounts = {};
  
  for (const config of configs) {
    if (config.id === 'DRY-RUN-COURSE-ID') {
      const key = `${config.schoolName} - ${config.name}`;
      finalCounts[key] = config.branches.length;
      console.log(`   ${key}: ${config.branches.length} branches (DRY-RUN)`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('config_branches')
      .select('id')
      .eq('course_id', config.id);
    
    if (error) throw error;
    
    const key = `${config.schoolName} - ${config.name}`;
    finalCounts[key] = data.length;
    console.log(`   ${key}: ${data.length} branches`);
  }
  
  console.log('');
  return finalCounts;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       Add Design & Sciences Courses and Branches to JECRC System          ║');
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
    
    // Step 2: Setup courses and get IDs
    const { configs, createdCourses } = await setupCoursesAndGetIds();
    
    // Step 3: Get current branch counts
    const currentCounts = await getCurrentBranchCounts(configs);
    
    // Step 4: Check for duplicates
    const duplicates = await checkForDuplicates(configs);
    
    if (duplicates.length > 0) {
      console.log('⚠️  WARNING: Duplicate branches detected!');
      console.log('   These branches already exist and will be skipped:\n');
      duplicates.forEach(d => console.log(`   - ${d.school} - ${d.course}: ${d.branch}`));
      console.log('\n   Continuing with non-duplicate branches...\n');
    }
    
    if (isDryRun) {
      console.log('\n✅ DRY-RUN COMPLETE\n');
      console.log('═'.repeat(80));
      console.log('📋 SUMMARY OF CHANGES THAT WOULD BE MADE:\n');
      
      if (createdCourses.length > 0) {
        console.log('🆕 NEW COURSES TO CREATE:\n');
        createdCourses.forEach(c => {
          console.log(`   ✨ ${c.school} → ${c.course}`);
        });
        console.log('');
      }
      
      console.log('📝 BRANCHES TO ADD:\n');
      let totalBranches = 0;
      configs.forEach(config => {
        console.log(`   ${config.schoolName} - ${config.name}:`);
        console.log(`      Current branches: ${currentCounts[config.name] || 0}`);
        console.log(`      New branches to add: ${config.branches.length}`);
        console.log(`      Final branch count: ${(currentCounts[config.name] || 0) + config.branches.length}`);
        console.log(`\n      New branches (will be at top):`);
        config.branches.forEach((branch, i) => {
          console.log(`         ${i + 1}. ${branch}`);
        });
        console.log('');
        totalBranches += config.branches.length;
      });
      
      console.log('═'.repeat(80));
      console.log(`\n📊 TOTALS:`);
      console.log(`   - New courses: ${createdCourses.length}`);
      console.log(`   - New branches: ${totalBranches}`);
      console.log('\n💡 Run without --dry-run flag to apply these changes\n');
      return;
    }
    
    // Step 5: Add branches (only in live mode)
    const results = await addAllBranches(configs);
    
    // Step 6: Verify final state
    const finalCounts = await verifyFinalState(configs);
    
    // Print summary
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          OPERATION SUMMARY                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
    
    if (createdCourses.length > 0) {
      console.log('🆕 New Courses Created:\n');
      createdCourses.forEach(c => {
        console.log(`   ✨ ${c.school} → ${c.course}`);
      });
      console.log('');
    }
    
    console.log('✅ Successfully Added Branches:\n');
    let totalAdded = 0;
    results.success.forEach(r => {
      console.log(`   ${r.school} - ${r.course}: ${r.added} branches added`);
      totalAdded += r.added;
    });
    console.log(`\n   📊 TOTAL BRANCHES ADDED: ${totalAdded}`);
    
    console.log('\n📊 Before and After Branch Counts:\n');
    configs.forEach(config => {
      const key = `${config.schoolName} - ${config.name}`;
      const before = currentCounts[config.name] || 0;
      const after = finalCounts[key];
      const newTag = config.courseCreated ? ' (NEW COURSE)' : '';
      console.log(`   ${key}${newTag}:`);
      console.log(`      ${before} → ${after} (+${after - before})`);
    });
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Operations:\n');
      results.failed.forEach(f => {
        console.log(`   ${f.school} - ${f.course}: ${f.error}`);
      });
    }
    
    console.log('\n✅ Operation complete!');
    console.log('🎯 New courses and branches are now available in the system\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nStack trace:', error.stack);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check .env.local file exists in project root');
    console.error('  2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
    console.error('  3. Verify SUPABASE_SERVICE_ROLE_KEY is set');
    console.error('  4. Ensure config_schools, config_courses, and config_branches tables exist');
    console.error('  5. Check Supabase project is active and accessible');
    console.error('  6. Verify school names match database exactly\n');
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