/**
 * JECRC No Dues System - Production Staff Account Setup
 * 
 * This script creates ALL staff accounts with proper department and scope assignments:
 * 
 * ADMIN:
 * - admin@jecrcu.edu.in (Admin@2025)
 * 
 * DEPARTMENT STAFF (Non-HOD - See ALL students):
 * - surbhi.jetavat@jecrcu.edu.in (Accounts)
 * - vishaltiwari642@gmail.com (Library)
 * - seniormanager.it@jecrcu.edu.in (IT Department)
 * - sailendra.trivedi@jecrcu.edu.in (Mess)
 * - akshar.bhardwaj@jecrcu.edu.in (Hostel)
 * - anurag.sharma@jecrcu.edu.in (Alumni)
 * - ganesh.jat@jecrcu.edu.in (Registrar)
 * - umesh.sharma@jecrcu.edu.in (Canteen)
 * - arjit.jain@jecrcu.edu.in (TPO)
 * 
 * SCHOOL HODs (Scoped to specific schools/courses/branches):
 * - prachiagarwal211@gmail.com (BCA/MCA - 22 branches)
 * - 15anuragsingh2003@gmail.com (CSE only - 16 branches)
 * - anurag.22bcom1367@jecrcu.edu.in (MBA, BBA, BCOM)
 * - razorrag.official@gmail.com (JMC, Hotel, Design, Law, Science, Humanities)
 * 
 * All accounts use password: Test@1234 (except admin)
 * 
 * Usage: node scripts/setup-production-staff-accounts.js
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

// ============================================================================
// STAFF ACCOUNT CONFIGURATION
// ============================================================================

const STAFF_ACCOUNTS = [
  // ADMIN ACCOUNT
  {
    email: 'admin@jecrcu.edu.in',
    password: 'Admin@2025',
    full_name: 'System Administrator',
    role: 'admin',
    department_name: null,
    scope: 'ALL' // Sees everything
  },
  
  // DEPARTMENT STAFF (Non-HOD - See ALL students)
  {
    email: 'surbhi.jetavat@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Surbhi Jetavat',
    role: 'department',
    department_name: 'accounts_department',
    scope: 'ALL'
  },
  {
    email: 'vishaltiwari642@gmail.com',
    password: 'Test@1234',
    full_name: 'Vishal Tiwari',
    role: 'department',
    department_name: 'library',
    scope: 'ALL'
  },
  {
    email: 'seniormanager.it@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'IT Senior Manager',
    role: 'department',
    department_name: 'it_department',
    scope: 'ALL'
  },
  {
    email: 'sailendra.trivedi@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Sailendra Trivedi',
    role: 'department',
    department_name: 'mess',
    scope: 'ALL'
  },
  {
    email: 'akshar.bhardwaj@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Akshar Bhardwaj',
    role: 'department',
    department_name: 'hostel',
    scope: 'ALL'
  },
  {
    email: 'anurag.sharma@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Anurag Sharma',
    role: 'department',
    department_name: 'alumni_association',
    scope: 'ALL'
  },
  {
    email: 'ganesh.jat@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Ganesh Jat',
    role: 'department',
    department_name: 'registrar',
    scope: 'ALL'
  },
  {
    email: 'umesh.sharma@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Umesh Sharma',
    role: 'department',
    department_name: 'canteen',
    scope: 'ALL'
  },
  {
    email: 'arjit.jain@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Arjit Jain',
    role: 'department',
    department_name: 'tpo',
    scope: 'ALL'
  },
  
  // SCHOOL HODs (Scoped to specific schools/courses/branches)
  {
    email: 'prachiagarwal211@gmail.com',
    password: 'Test@1234',
    full_name: 'Prachi Agarwal',
    role: 'department',
    department_name: 'school_hod',
    school_name: 'School of Computer Applications',
    courses: ['BCA', 'MCA'],
    branches: null, // All branches (22 total)
    scope: 'BCA/MCA (22 branches)'
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
      // B.Tech CSE branches (15)
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
      'B.Tech Lateral Entry / Migration'
      // Note: M.Tech CSE is also "Computer Science and Engineering" but in M.Tech course
    ],
    scope: 'CSE only (16 branches: 15 B.Tech + 1 M.Tech)'
  },
  {
    email: 'anurag.22bcom1367@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Anurag Kumar',
    role: 'department',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['MBA', 'BBA', 'B.Com'],
    branches: null, // All branches
    scope: 'MBA, BBA, BCOM (all branches)'
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
    courses: null, // All courses
    branches: null, // All branches
    scope: 'JMC, Hotel, Design, Law, Science, Humanities (all courses/branches)'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getSchoolId(schoolName) {
  const { data, error } = await supabase
    .from('config_schools')
    .select('id')
    .eq('name', schoolName)
    .single();
  
  if (error) {
    console.error(`   ❌ Error fetching school "${schoolName}":`, error.message);
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
    console.error(`   ❌ Error fetching courses:`, error.message);
    return [];
  }
  return data || [];
}

async function getBranchIds(courseIds, branchNames) {
  const { data, error } = await supabase
    .from('config_branches')
    .select('id, name, course_id')
    .in('course_id', courseIds)
    .in('name', branchNames);
  
  if (error) {
    console.error(`   ❌ Error fetching branches:`, error.message);
    return [];
  }
  return data || [];
}

async function getAllBranchIdsForCourses(courseIds) {
  const { data, error } = await supabase
    .from('config_branches')
    .select('id')
    .in('course_id', courseIds);
  
  if (error) {
    console.error(`   ❌ Error fetching all branches:`, error.message);
    return [];
  }
  return data?.map(b => b.id) || [];
}

async function getAllCoursesForSchools(schoolIds) {
  const { data, error } = await supabase
    .from('config_courses')
    .select('id')
    .in('school_id', schoolIds);
  
  if (error) {
    console.error(`   ❌ Error fetching courses for schools:`, error.message);
    return [];
  }
  return data?.map(c => c.id) || [];
}

// ============================================================================
// MAIN ACCOUNT CREATION FUNCTION
// ============================================================================

async function createStaffAccount(account) {
  try {
    console.log(`\n📧 Processing: ${account.email}`);
    console.log(`   Name: ${account.full_name}`);
    console.log(`   Role: ${account.role}`);
    console.log(`   Department: ${account.department_name || 'N/A (Admin)'}`);
    console.log(`   Scope: ${account.scope}`);
    
    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', account.email)
      .single();
    
    if (existingProfile) {
      console.log(`   ⚠️  Account already exists - SKIPPING`);
      return { status: 'skipped', email: account.email };
    }
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.full_name,
        role: account.role
      }
    });
    
    if (authError) {
      console.error(`   ❌ Auth creation failed: ${authError.message}`);
      return { status: 'error', email: account.email, error: authError.message };
    }
    
    const userId = authData.user.id;
    console.log(`   ✅ Auth user created: ${userId.substring(0, 8)}...`);
    
    // Prepare profile data
    const profileData = {
      id: userId,
      email: account.email,
      full_name: account.full_name,
      role: account.role,
      department_name: account.department_name,
      is_active: true
    };
    
    // Handle scoping based on account type
    if (account.role === 'admin') {
      // Admin sees everything
      profileData.school_ids = null;
      profileData.course_ids = null;
      profileData.branch_ids = null;
      console.log(`   ✅ Admin - Full access to all students`);
      
    } else if (account.department_name === 'school_hod') {
      // School HOD - Apply scoping
      if (account.schools) {
        // Multiple schools (razorrag case)
        const schoolIds = [];
        for (const schoolName of account.schools) {
          const schoolId = await getSchoolId(schoolName);
          if (schoolId) schoolIds.push(schoolId);
        }
        profileData.school_ids = schoolIds;
        
        // Get all courses for these schools
        const courseIds = await getAllCoursesForSchools(schoolIds);
        profileData.course_ids = courseIds;
        
        // Get all branches for these courses
        if (courseIds.length > 0) {
          const branchIds = await getAllBranchIdsForCourses(courseIds);
          profileData.branch_ids = branchIds;
        }
        
        console.log(`   ✅ Assigned ${schoolIds.length} schools, ${courseIds.length} courses, ${profileData.branch_ids?.length || 0} branches`);
        
      } else if (account.school_name) {
        // Single school with specific courses
        const schoolId = await getSchoolId(account.school_name);
        if (schoolId) {
          profileData.school_ids = [schoolId];
          
          if (account.courses) {
            const courses = await getCourseIds(schoolId, account.courses);
            const courseIds = courses.map(c => c.id);
            profileData.course_ids = courseIds;
            
            if (account.branches) {
              // Specific branches (CSE case)
              const branches = await getBranchIds(courseIds, account.branches);
              profileData.branch_ids = branches.map(b => b.id);
              console.log(`   ✅ Assigned 1 school, ${courseIds.length} courses, ${profileData.branch_ids.length} specific branches`);
            } else {
              // All branches in those courses
              const branchIds = await getAllBranchIdsForCourses(courseIds);
              profileData.branch_ids = branchIds;
              console.log(`   ✅ Assigned 1 school, ${courseIds.length} courses, ${branchIds.length} branches (all)`);
            }
          }
        }
      }
    } else {
      // Regular department staff - see all students
      profileData.school_ids = null;
      profileData.course_ids = null;
      profileData.branch_ids = null;
      console.log(`   ✅ Department staff - Sees all students`);
    }
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);
    
    if (profileError) {
      console.error(`   ❌ Profile creation failed: ${profileError.message}`);
      // Cleanup auth user
      await supabase.auth.admin.deleteUser(userId);
      return { status: 'error', email: account.email, error: profileError.message };
    }
    
    console.log(`   ✅ Profile created successfully`);
    return { status: 'created', email: account.email };
    
  } catch (error) {
    console.error(`   ❌ Unexpected error: ${error.message}`);
    return { status: 'error', email: account.email, error: error.message };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  JECRC NO DUES - PRODUCTION STAFF ACCOUNT SETUP           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Total accounts to process: ${STAFF_ACCOUNTS.length}`);
  console.log(`   - 1 Admin`);
  console.log(`   - 9 Department Staff (non-HOD)`);
  console.log(`   - 4 School HODs\n`);
  
  const results = {
    created: [],
    skipped: [],
    errors: []
  };
  
  for (const account of STAFF_ACCOUNTS) {
    const result = await createStaffAccount(account);
    
    if (result.status === 'created') {
      results.created.push(result.email);
    } else if (result.status === 'skipped') {
      results.skipped.push(result.email);
    } else {
      results.errors.push({ email: result.email, error: result.error });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              ACCOUNT CREATION SUMMARY                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  if (results.created.length > 0) {
    console.log('✅ Successfully Created:');
    console.log('─'.repeat(70));
    results.created.forEach(email => console.log(`   ✓ ${email}`));
    console.log('─'.repeat(70));
  }
  
  if (results.skipped.length > 0) {
    console.log('\n⚠️  Already Exist (Skipped):');
    console.log('─'.repeat(70));
    results.skipped.forEach(email => console.log(`   ⊘ ${email}`));
    console.log('─'.repeat(70));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    console.log('─'.repeat(70));
    results.errors.forEach(err => console.log(`   ✗ ${err.email}: ${err.error}`));
    console.log('─'.repeat(70));
  }
  
  // Print credentials table
  console.log('\n\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║              ALL STAFF LOGIN CREDENTIALS                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ ADMIN ACCOUNT                                                   │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log('│ Email:    admin@jecrcu.edu.in                                   │');
  console.log('│ Password: Admin@2025                                            │');
  console.log('│ Access:   Full system access                                    │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ DEPARTMENT STAFF (Password: Test@1234 for all)                 │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log('│ 1.  surbhi.jetavat@jecrcu.edu.in         (Accounts)            │');
  console.log('│ 2.  vishaltiwari642@gmail.com            (Library)             │');
  console.log('│ 3.  seniormanager.it@jecrcu.edu.in       (IT Department)       │');
  console.log('│ 4.  sailendra.trivedi@jecrcu.edu.in      (Mess)                │');
  console.log('│ 5.  akshar.bhardwaj@jecrcu.edu.in        (Hostel)              │');
  console.log('│ 6.  anurag.sharma@jecrcu.edu.in          (Alumni)              │');
  console.log('│ 7.  ganesh.jat@jecrcu.edu.in             (Registrar)           │');
  console.log('│ 8.  umesh.sharma@jecrcu.edu.in           (Canteen)             │');
  console.log('│ 9.  arjit.jain@jecrcu.edu.in             (TPO)                 │');
  console.log('│                                                                 │');
  console.log('│ Access: All students (no filtering)                            │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ SCHOOL HODs (Password: Test@1234 for all)                      │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log('│ 1. prachiagarwal211@gmail.com                                   │');
  console.log('│    Scope: BCA/MCA (22 branches)                                 │');
  console.log('│                                                                 │');
  console.log('│ 2. 15anuragsingh2003@gmail.com                                  │');
  console.log('│    Scope: CSE only (16 branches: 15 B.Tech + 1 M.Tech)         │');
  console.log('│                                                                 │');
  console.log('│ 3. anurag.22bcom1367@jecrcu.edu.in                              │');
  console.log('│    Scope: MBA, BBA, BCOM (all branches)                         │');
  console.log('│                                                                 │');
  console.log('│ 4. razorrag.official@gmail.com                                  │');
  console.log('│    Scope: JMC, Hotel, Design, Law, Science, Humanities          │');
  console.log('│           (all courses and branches)                            │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  console.log('⚠️  IMPORTANT NOTES:');
  console.log('─'.repeat(70));
  console.log('1. Login URL: https://nodues.jecrcuniversity.edu.in/staff/login');
  console.log('2. Admin login: /admin/login');
  console.log('3. All staff should change password after first login');
  console.log('4. HOD scoping filters students automatically');
  console.log('5. Department staff see ALL students regardless of school');
  console.log('─'.repeat(70));
  
  console.log('\n📊 Statistics:');
  console.log(`   Created: ${results.created.length}`);
  console.log(`   Skipped: ${results.skipped.length}`);
  console.log(`   Errors:  ${results.errors.length}`);
  console.log(`   Total:   ${STAFF_ACCOUNTS.length}\n`);
  
  if (results.created.length > 0) {
    console.log('✅ Staff account setup complete!\n');
  } else if (results.skipped.length === STAFF_ACCOUNTS.length) {
    console.log('ℹ️  All accounts already exist. No changes made.\n');
  } else {
    console.log('⚠️  Setup completed with some errors. Review above.\n');
  }
}

// Run the script
main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    console.error(error);
    process.exit(1);
  });