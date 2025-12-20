/**
 * Create ALL HOD Department Staff Accounts for JECRC No Dues System
 * 
 * This script creates HOD accounts for ALL departments with their proper email mappings
 * Each HOD is mapped to their specific school for proper scoping
 * 
 * All accounts use password: Test@1234
 * 
 * Usage: node scripts/create-all-hod-accounts.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

// ALL HOD DEPARTMENT STAFF ACCOUNTS WITH PROPER EMAIL MAPPINGS
const HOD_ACCOUNTS = [
  // Engineering & Technology School HODs
  {
    email: 'hod.ece@jecrcu.edu.in',
    full_name: 'HOD - Electronics and Communication Engineering',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    courses: ['B.Tech', 'M.Tech'],
    description: 'ECE Department HOD'
  },
  {
    email: 'hod.mechanical@jecrcu.edu.in',
    full_name: 'HOD - Mechanical Engineering',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    courses: ['B.Tech', 'M.Tech'],
    description: 'Mechanical Engineering Department HOD'
  },
  {
    email: 'hod.cse@jecrcu.edu.in',
    full_name: 'HOD - Computer Science and Engineering',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    courses: ['B.Tech', 'M.Tech'],
    description: 'CSE Department HOD (Primary)'
  },
  {
    email: 'hod.csedept@jecrcu.edu.in',
    full_name: 'HOD - Computer Science and Engineering (Alt)',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    courses: ['B.Tech', 'M.Tech'],
    description: 'CSE Department HOD (Secondary)'
  },
  {
    email: 'hod.ce@jecrcu.edu.in',
    full_name: 'HOD - Civil Engineering',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    courses: ['B.Tech', 'M.Tech'],
    description: 'Civil Engineering Department HOD'
  },
  
  // Computer Applications School HODs
  {
    email: 'hod.ca@jecrcu.edu.in',
    full_name: 'HOD - Computer Applications',
    department_name: 'school_hod',
    school_name: 'School of Computer Applications',
    courses: ['BCA', 'MCA'],
    description: 'BCA/MCA Department HOD (Primary)'
  },
  {
    email: 'neha.gupta03@jecrcu.edu.in',
    full_name: 'Neha Gupta - CA Sunstone',
    department_name: 'school_hod',
    school_name: 'School of Computer Applications',
    courses: ['BCA', 'MCA'],
    description: 'CA Sunstone Coordinator'
  },
  
  // Law School HODs
  {
    email: 'hod.law@jecrcu.edu.in',
    full_name: 'HOD - School of Law',
    department_name: 'school_hod',
    school_name: 'School of Law',
    courses: ['Integrated Law Programs (Hons.)', 'LL.M - 2 Years'],
    description: 'Law Department HOD'
  },
  
  // Business School HODs
  {
    email: 'hod.mba@jecrcu.edu.in',
    full_name: 'HOD - MBA',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['MBA'],
    description: 'MBA Department HOD'
  },
  {
    email: 'hod.bba@jecrcu.edu.in',
    full_name: 'HOD - BBA',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['BBA'],
    description: 'BBA Department HOD'
  },
  {
    email: 'hod.bcom@jecrcu.edu.in',
    full_name: 'HOD - B.Com',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['B.Com'],
    description: 'B.Com Department HOD'
  },
  {
    email: 'jyoti.meratwal@sunstone.in',
    full_name: 'Jyoti Meratwal - BBA Sunstone',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['BBA'],
    description: 'BBA Sunstone Coordinator'
  },
  {
    email: 'vandana.ladha@sunstone.in',
    full_name: 'Vandana Ladha - MBA Sunstone',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['MBA'],
    description: 'MBA Sunstone Coordinator'
  },
  {
    email: 'sunita.sharma01@jecrcu.edu.in',
    full_name: 'Sunita Sharma - BBA/MBA CollegeDekho',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['BBA', 'MBA'],
    description: 'BBA/MBA CollegeDekho Coordinator'
  },
  {
    email: 'nimesh.gupta@jecrcu.edu.in',
    full_name: 'Nimesh Gupta - ISDC',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['BBA', 'B.Com', 'MBA'],
    description: 'ISDC Programs Coordinator'
  },
  
  // Hospitality School HODs
  {
    email: 'hod.hotelmanagement@jecrcu.edu.in',
    full_name: 'HOD - Hotel Management',
    department_name: 'school_hod',
    school_name: 'School of Hospitality',
    courses: ['B.Sc. Hospitality and Hotel Management (HHM)'],
    description: 'Hotel Management Department HOD'
  },
  
  // Mass Communication School HODs
  {
    email: 'hod.jmc@jecrcu.edu.in',
    full_name: 'HOD - Journalism & Mass Communication',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Mass Communication',
    courses: ['B.A. Journalism & Mass Communication', 'M.A. Journalism & Mass Communication'],
    description: 'JMC Department HOD'
  },
  
  // Design School HODs
  {
    email: 'hod.design@jecrcu.edu.in',
    full_name: 'HOD - Design',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Design',
    courses: ['Bachelor of Visual Arts (BVA)', 'B.Des - 4 Years', 'Masters of Visual Arts (MVA)', 'M.Des', 'M.Sc (Design)'],
    description: 'Design Department HOD'
  },
  
  // Sciences School HODs
  {
    email: 'hod.biotechnology@jecrcu.edu.in',
    full_name: 'HOD - Biotechnology',
    department_name: 'school_hod',
    school_name: 'School of Sciences',
    courses: ['B.Sc (Hons.) - 4 Years', 'M.Sc'],
    description: 'Biotechnology Department HOD'
  },
  {
    email: 'hod.microbiology@jecrcu.edu.in',
    full_name: 'HOD - Microbiology',
    department_name: 'school_hod',
    school_name: 'School of Sciences',
    courses: ['B.Sc (Hons.) - 4 Years', 'M.Sc'],
    description: 'Microbiology Department HOD'
  },
  {
    email: 'hod.forensic@jecrcu.edu.in',
    full_name: 'HOD - Forensic Science',
    department_name: 'school_hod',
    school_name: 'School of Sciences',
    courses: ['B.Sc (Hons.) - 4 Years', 'M.Sc'],
    description: 'Forensic Science Department HOD'
  },
  {
    email: 'hod.mathmatics@jecrcu.edu.in',
    full_name: 'HOD - Mathematics',
    department_name: 'school_hod',
    school_name: 'School of Sciences',
    courses: ['M.Sc'],
    description: 'Mathematics Department HOD'
  },
  {
    email: 'hod.physics@jecrcu.edu.in',
    full_name: 'HOD - Physics',
    department_name: 'school_hod',
    school_name: 'School of Sciences',
    courses: ['M.Sc'],
    description: 'Physics Department HOD'
  },
  {
    email: 'hod.chemistry@jecrcu.edu.in',
    full_name: 'HOD - Chemistry',
    department_name: 'school_hod',
    school_name: 'School of Sciences',
    courses: ['M.Sc'],
    description: 'Chemistry Department HOD'
  },
  
  // Humanities & Social Sciences School HODs
  {
    email: 'hod.economics@jecrcu.edu.in',
    full_name: 'HOD - Economics',
    department_name: 'school_hod',
    school_name: 'School of Humanities & Social Sciences',
    courses: ['B.A. (Hons.) - 4 Years', 'M.A.'],
    description: 'Economics Department HOD'
  },
  {
    email: 'hod.english@jecrcu.edu.in',
    full_name: 'HOD - English',
    department_name: 'school_hod',
    school_name: 'School of Humanities & Social Sciences',
    courses: ['B.A. (Hons.) - 4 Years', 'M.A.'],
    description: 'English Department HOD'
  },
  {
    email: 'hod.psychology@jecrcu.edu.in',
    full_name: 'HOD - Psychology',
    department_name: 'school_hod',
    school_name: 'School of Humanities & Social Sciences',
    courses: ['B.A. (Hons.) - 4 Years', 'M.A.'],
    description: 'Psychology Department HOD'
  },
  {
    email: 'hod.political@jecrcu.edu.in',
    full_name: 'HOD - Political Science',
    department_name: 'school_hod',
    school_name: 'School of Humanities & Social Sciences',
    courses: ['B.A. (Hons.) - 4 Years', 'M.A.'],
    description: 'Political Science Department HOD'
  },
  
  // Allied Health Sciences School HODs (NEW - Need to add)
  {
    email: 'hod.bpt@jecrcu.edu.in',
    full_name: 'HOD - Physiotherapy (BPT)',
    department_name: 'school_hod',
    school_name: 'School of Allied Health Sciences',
    courses: ['Bachelor of Physiotherapy (BPT)', 'Master of Physiotherapy (MPT)'],
    description: 'BPT Department HOD'
  },
  {
    email: 'hod.brit@jecrcu.edu.in',
    full_name: 'HOD - BRIT',
    department_name: 'school_hod',
    school_name: 'School of Allied Health Sciences',
    courses: ['Bachelor of Physiotherapy (BPT)'],
    description: 'BRIT Department HOD'
  },
  {
    email: 'hod.bmlt@jecrcu.edu.in',
    full_name: 'HOD - BMLT',
    department_name: 'school_hod',
    school_name: 'School of Allied Health Sciences',
    courses: ['Bachelor of Physiotherapy (BPT)'],
    description: 'BMLT Department HOD'
  }
];

async function createAllHODAccounts() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Creating ALL HOD Department Staff Accounts                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables. Check .env.local file.');
    }

    console.log('🔍 Checking for existing accounts...\n');

    // Get all existing users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingEmails = new Set(existingUsers.users.map(u => u.email));

    // Get all schools for mapping
    const { data: schools } = await supabase
      .from('config_schools')
      .select('id, name');
    
    const schoolMap = new Map(schools.map(s => [s.name, s.id]));

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    // Create each HOD account
    for (const hod of HOD_ACCOUNTS) {
      console.log(`\n📧 Processing: ${hod.email}`);
      console.log(`   Name: ${hod.full_name}`);
      console.log(`   School: ${hod.school_name}`);
      console.log(`   Courses: ${hod.courses.join(', ')}`);
      console.log(`   Description: ${hod.description}`);

      // Check if user already exists
      if (existingEmails.has(hod.email)) {
        console.log(`   ⚠️  Account already exists - SKIPPING`);
        results.skipped.push(hod.email);
        continue;
      }

      try {
        // Step 1: Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: hod.email,
          password: 'Test@1234',
          email_confirm: true,
          user_metadata: {
            full_name: hod.full_name,
            role: 'department',
            department_name: hod.department_name
          }
        });

        if (authError) {
          throw authError;
        }

        console.log(`   ✅ Auth user created (ID: ${authData.user.id.substring(0, 8)}...)`);

        // Get school_id
        const school_id = schoolMap.get(hod.school_name);
        if (!school_id) {
          throw new Error(`School not found: ${hod.school_name}`);
        }

        // Get course_ids for this school
        const { data: courses } = await supabase
          .from('config_courses')
          .select('id')
          .eq('school_id', school_id)
          .in('name', hod.courses);

        const course_ids = courses.map(c => c.id);

        // Get department_id for the department_name (CRITICAL FIX)
        const { data: deptData } = await supabase
          .from('departments')
          .select('id')
          .eq('name', hod.department_name)
          .single();

        if (!deptData) {
          throw new Error(`Department not found: ${hod.department_name}`);
        }

        const department_id = deptData.id;

        // Step 2: Create profile record with proper scoping
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: hod.email,
            full_name: hod.full_name,
            role: 'department',
            department_name: hod.department_name,
            assigned_department_ids: [department_id],  // CRITICAL: Map to department UUID
            school_id: school_id,  // Single school (backward compatibility)
            school_ids: [school_id],  // Array for filtering
            course_ids: course_ids.length > 0 ? course_ids : null,  // Specific courses or all
            branch_ids: null,  // NULL = sees ALL branches within their courses
            is_active: true
          }]);

        if (profileError) {
          // Rollback: delete the auth user if profile creation fails
          console.log(`   ⚠️  Profile creation failed, rolling back...`);
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw profileError;
        }

        console.log(`   ✅ Profile created with proper scoping`);
        console.log(`   ✅ Account fully configured`);
        
        results.created.push(hod.email);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.errors.push({ email: hod.email, error: error.message });
      }
    }

    // Print summary
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ACCOUNT CREATION SUMMARY                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

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

    // Print important notes
    console.log('\n\n⚠️  IMPORTANT NOTES:');
    console.log('─'.repeat(70));
    console.log('1. All accounts use password: Test@1234');
    console.log('2. Users should change password after first login');
    console.log('3. Each HOD is scoped to their specific school and courses');
    console.log('4. HODs can see ALL branches within their assigned courses');
    console.log('5. Login URL: https://no-duessystem.vercel.app/staff/login');
    console.log('6. Staff dashboard: /staff/dashboard (after login)');
    console.log('─'.repeat(70));

    console.log('\n✅ HOD account setup complete!\n');

    // Print summary statistics
    console.log('📊 Statistics:');
    console.log(`   Total HODs in list: ${HOD_ACCOUNTS.length}`);
    console.log(`   Created: ${results.created.length}`);
    console.log(`   Skipped: ${results.skipped.length}`);
    console.log(`   Errors:  ${results.errors.length}\n`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check .env.local file exists in project root');
    console.error('  2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
    console.error('  3. Verify SUPABASE_SERVICE_ROLE_KEY is set (not anon key!)');
    console.error('  4. Ensure database tables exist (run FINAL_COMPLETE_DATABASE_SETUP.sql)');
    console.error('  5. Check Supabase project is active and accessible');
    console.error('  6. Verify you have admin/service role permissions\n');
    process.exit(1);
  }
}

// Main execution
createAllHODAccounts()
  .then(() => {
    console.log('✅ Script completed successfully');
    console.log('🚀 All HODs can now login at: https://no-duessystem.vercel.app/staff/login\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });