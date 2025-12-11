/**
 * JECRC No Dues System - Staff Account Migration Script
 * 
 * This script:
 * 1. Removes all old staff accounts (except admin)
 * 2. Creates new staff accounts with updated email addresses
 * 3. Assigns proper department access and school/course/branch scoping
 * 
 * NEW STAFF CONFIGURATION:
 * - admin@jecrcu.edu.in (Admin - keep as is)
 * - surbhi.jetavat@jecrcu.edu.in (Accounts)
 * - vishal.tiwari@jecrcu.edu.in (Library)
 * - seniormanager.it@jecrcu.edu.in (IT Department)
 * - sailendra.trivedi@jecrcu.edu.in (Mess)
 * - akshar.bhardwaj@jecrcu.edu.in (Hostel)
 * - anurag.sharma@jecrcu.edu.in (Alumni)
 * - ganesh.jat@jecrcu.edu.in (Registrar)
 * - umesh.sharma@jecrcu.edu.in (Canteen)
 * - arjit.jain@jecrcu.edu.in (TPO)
 * - prachiagarwal211@gmail.com (School HOD - BCA/MCA)
 * - 15anuragsingh2003@gmail.com (School HOD - CSE)
 * - anurag.22bcom1367@jecrcu.edu.in (School HOD - Business School)
 * - razorrag.official@gmail.com (School HOD - Multiple Schools)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// New staff configuration with department assignments
const NEW_STAFF_ACCOUNTS = [
  {
    email: 'surbhi.jetavat@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Surbhi Jetavat',
    role: 'department',
    department_name: 'accounts_department',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'vishal.tiwari@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Vishal Tiwari',
    role: 'department',
    department_name: 'library',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'seniormanager.it@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'IT Senior Manager',
    role: 'department',
    department_name: 'it_department',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'sailendra.trivedi@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Sailendra Trivedi',
    role: 'department',
    department_name: 'mess',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'akshar.bhardwaj@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Akshar Bhardwaj',
    role: 'department',
    department_name: 'hostel',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'anurag.sharma@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Anurag Sharma',
    role: 'department',
    department_name: 'alumni_association',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'ganesh.jat@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Ganesh Jat',
    role: 'department',
    department_name: 'registrar',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'umesh.sharma@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Umesh Sharma',
    role: 'department',
    department_name: 'canteen',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'arjit.jain@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Arjit Jain',
    role: 'department',
    department_name: 'tpo',
    school_ids: null, // See all students
    course_ids: null,
    branch_ids: null
  },
  {
    email: 'prachiagarwal211@gmail.com',
    password: 'Test@1234',
    full_name: 'Prachi Agarwal',
    role: 'department',
    department_name: 'school_hod',
    school_name: 'School of Computer Applications',
    courses: ['BCA', 'MCA'], // All branches under BCA and MCA
    branches: null // null = all branches
  },
  {
    email: '15anuragsingh2003@gmail.com',
    password: 'Test@1234',
    full_name: 'Anurag Singh',
    role: 'department',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    courses: ['B.Tech', 'M.Tech'],
    branches: [
      // B.Tech CSE branches
      'Computer Science and Engineering',
      'CSE - Artificial Intelligence and Data Science',
      'CSE - Generative AI (L&T EduTech)',
      'CSE - Software Product Engineering with Kalvium',
      'CSE - Artificial Intelligence and Machine Learning (Xebia)',
      'CSE - Full Stack Web Design and Development (Xebia)',
      'CSE - Artificial Intelligence and Machine Learning (Samatrix.io)',
      'CSE - Data Science and Data Analytics (Samatrix.io)',
      'CSE - Cyber Security (EC-Council, USA)',
      'Computer Science and Business Systems (CSBS) - TCS',
      'CSE - Artificial Intelligence and Machine Learning (IBM)',
      'CSE - Cloud Computing (Microsoft)',
      'CSE - Cloud Computing (AWS Verified Program)',
      'CSE - Blockchain (upGrad Campus)',
      'B.Tech Lateral Entry / Migration',
      // M.Tech CSE branch
      'Computer Science and Engineering' // M.Tech CSE
    ]
  },
  {
    email: 'anurag.22bcom1367@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Anurag Kumar',
    role: 'department',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['BBA', 'B.Com', 'MBA'], // All branches under these courses
    branches: null // null = all branches
  },
  {
    email: 'razorrag.official@gmail.com',
    password: 'Test@1234',
    full_name: 'Razorrag',
    role: 'department',
    department_name: 'school_hod',
    schools: [
      'Jaipur School of Mass Communication',
      'School of Hospitality',
      'Jaipur School of Design',
      'School of Law',
      'School of Sciences',
      'School of Humanities & Social Sciences'
    ],
    courses: null, // null = all courses in these schools
    branches: null // null = all branches
  }
];

// Old accounts to be removed (except admin)
const OLD_ACCOUNTS_TO_REMOVE = [
  'razorrag.official@gmail.com', // Will be recreated with new config
  'prachiagarwal211@gmail.com', // Will be recreated with new config
  '15anuragsingh2003@gmail.com', // Will be recreated with new config
  'anurag.22bcom1367@jecrcu.edu.in' // Will be recreated with new config
];

async function getSchoolId(schoolName) {
  const { data, error } = await supabase
    .from('config_schools')
    .select('id')
    .eq('name', schoolName)
    .single();
  
  if (error) {
    console.error(`❌ Error fetching school "${schoolName}":`, error.message);
    return null;
  }
  return data?.id;
}

async function getCourseIds(schoolId, courseNames) {
  const { data, error } = await supabase
    .from('config_courses')
    .select('id, name')
    .eq('school_id', schoolId)
    .in('name', courseNames);
  
  if (error) {
    console.error(`❌ Error fetching courses:`, error.message);
    return [];
  }
  return data || [];
}

async function getBranchIds(courseId, branchNames) {
  const { data, error } = await supabase
    .from('config_branches')
    .select('id, name')
    .eq('course_id', courseId)
    .in('name', branchNames);
  
  if (error) {
    console.error(`❌ Error fetching branches:`, error.message);
    return [];
  }
  return data || [];
}

async function removeOldAccounts() {
  console.log('\n🗑️  STEP 1: Removing old staff accounts...\n');
  
  for (const email of OLD_ACCOUNTS_TO_REMOVE) {
    try {
      // Get user ID from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (profile) {
        // Delete from auth.users (this will cascade to profiles)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.id);
        
        if (deleteError) {
          console.log(`⚠️  Could not delete ${email}: ${deleteError.message}`);
        } else {
          console.log(`✅ Removed: ${email}`);
        }
      } else {
        console.log(`ℹ️  Not found: ${email}`);
      }
    } catch (error) {
      console.error(`❌ Error removing ${email}:`, error.message);
    }
  }
}

async function createStaffAccount(account) {
  try {
    console.log(`\n📝 Creating: ${account.email}`);
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true
    });
    
    if (authError) {
      console.error(`❌ Auth creation failed: ${authError.message}`);
      return false;
    }
    
    const userId = authData.user.id;
    console.log(`   ✓ Auth user created: ${userId}`);
    
    // Prepare profile data
    const profileData = {
      id: userId,
      email: account.email,
      full_name: account.full_name,
      role: account.role,
      department_name: account.department_name,
      is_active: true
    };
    
    // Handle scoping for school HODs
    if (account.department_name === 'school_hod') {
      if (account.schools) {
        // Multiple schools (razorrag case)
        const schoolIds = [];
        for (const schoolName of account.schools) {
          const schoolId = await getSchoolId(schoolName);
          if (schoolId) schoolIds.push(schoolId);
        }
        profileData.school_ids = schoolIds;
        profileData.course_ids = null; // See all courses
        profileData.branch_ids = null; // See all branches
        console.log(`   ✓ Assigned ${schoolIds.length} schools (all courses/branches)`);
      } else if (account.school_name) {
        // Single school with specific courses
        const schoolId = await getSchoolId(account.school_name);
        if (schoolId) {
          profileData.school_id = schoolId;
          profileData.school_ids = [schoolId];
          
          if (account.courses) {
            const courses = await getCourseIds(schoolId, account.courses);
            const courseIds = courses.map(c => c.id);
            profileData.course_ids = courseIds;
            console.log(`   ✓ Assigned school + ${courseIds.length} courses`);
            
            if (account.branches) {
              // Specific branches (CSE case)
              const allBranchIds = [];
              for (const course of courses) {
                const branches = await getBranchIds(course.id, account.branches);
                allBranchIds.push(...branches.map(b => b.id));
              }
              profileData.branch_ids = allBranchIds;
              console.log(`   ✓ Assigned ${allBranchIds.length} specific branches`);
            } else {
              // All branches in those courses
              profileData.branch_ids = null;
              console.log(`   ✓ All branches in selected courses`);
            }
          }
        }
      }
    } else {
      // Non-HOD departments see all students
      profileData.school_ids = null;
      profileData.course_ids = null;
      profileData.branch_ids = null;
      console.log(`   ✓ Department staff - sees all students`);
    }
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);
    
    if (profileError) {
      console.error(`❌ Profile creation failed: ${profileError.message}`);
      // Cleanup auth user
      await supabase.auth.admin.deleteUser(userId);
      return false;
    }
    
    console.log(`✅ Successfully created: ${account.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating ${account.email}:`, error.message);
    return false;
  }
}

async function createNewAccounts() {
  console.log('\n\n🔨 STEP 2: Creating new staff accounts...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const account of NEW_STAFF_ACCOUNTS) {
    const success = await createStaffAccount(account);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully created: ${successCount} accounts`);
  console.log(`❌ Failed: ${failCount} accounts`);
  console.log('='.repeat(60));
}

async function verifyAccounts() {
  console.log('\n\n📊 STEP 3: Verifying all staff accounts...\n');
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('email, full_name, role, department_name, school_ids, course_ids, branch_ids')
    .eq('role', 'department')
    .order('department_name');
  
  if (error) {
    console.error('❌ Error fetching profiles:', error.message);
    return;
  }
  
  console.log(`Found ${profiles.length} department staff accounts:\n`);
  
  for (const profile of profiles) {
    const schoolCount = profile.school_ids?.length || 0;
    const courseCount = profile.course_ids?.length || 0;
    const branchCount = profile.branch_ids?.length || 0;
    
    console.log(`✓ ${profile.email}`);
    console.log(`  Name: ${profile.full_name}`);
    console.log(`  Department: ${profile.department_name}`);
    
    if (profile.department_name === 'school_hod') {
      if (schoolCount > 0) {
        console.log(`  Scope: ${schoolCount} school(s)`);
        if (courseCount > 0) {
          console.log(`         ${courseCount} course(s)`);
        } else {
          console.log(`         All courses`);
        }
        if (branchCount > 0) {
          console.log(`         ${branchCount} branch(es)`);
        } else {
          console.log(`         All branches`);
        }
      }
    } else {
      console.log(`  Scope: All students`);
    }
    console.log('');
  }
  
  // Check admin account
  const { data: admin } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .eq('role', 'admin')
    .single();
  
  if (admin) {
    console.log(`✓ Admin account: ${admin.email} (${admin.full_name})`);
  } else {
    console.log(`⚠️  Admin account not found!`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  JECRC NO DUES - STAFF ACCOUNT MIGRATION             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  try {
    // Step 1: Remove old accounts
    await removeOldAccounts();
    
    // Step 2: Create new accounts
    await createNewAccounts();
    
    // Step 3: Verify all accounts
    await verifyAccounts();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test login with each account');
    console.log('   2. Verify email notifications are sent to correct staff');
    console.log('   3. Check dashboard filtering for HODs');
    console.log('   4. Submit a test form to verify workflow\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();