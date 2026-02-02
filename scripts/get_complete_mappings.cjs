// Get complete mappings from reference tables
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

async function getCompleteMappings() {
  try {
    console.log('🔍 GETTING COMPLETE MAPPINGS...\n');
    
    // Get all schools
    console.log('🏫 ALL SCHOOLS:');
    const { data: schools, error: schoolsError } = await supabase
      .from('config_schools')
      .select('*')
      .order('display_order');
    
    if (schoolsError) {
      console.error('❌ Error getting schools:', schoolsError.message);
    } else {
      schools.forEach(school => {
        console.log(`  ${school.id}: ${school.name} (${school.is_active ? 'Active' : 'Inactive'})`);
      });
    }
    
    // Get all courses
    console.log('\n📚 ALL COURSES:');
    const { data: courses, error: coursesError } = await supabase
      .from('config_courses')
      .select('*')
      .order('display_order');
    
    if (coursesError) {
      console.error('❌ Error getting courses:', coursesError.message);
    } else {
      courses.forEach(course => {
        const school = schools.find(s => s.id === course.school_id);
        console.log(`  ${course.id}: ${course.name} (School: ${school ? school.name : 'Unknown'}) (${course.is_active ? 'Active' : 'Inactive'})`);
      });
    }
    
    // Get all branches
    console.log('\n🌿 ALL BRANCHES:');
    const { data: branches, error: branchesError } = await supabase
      .from('config_branches')
      .select('*')
      .order('display_order');
    
    if (branchesError) {
      console.error('❌ Error getting branches:', branchesError.message);
    } else {
      branches.forEach(branch => {
        const course = courses.find(c => c.id === branch.course_id);
        const school = course ? schools.find(s => s.id === course.school_id) : null;
        console.log(`  ${branch.id}: ${branch.name} (Course: ${course ? course.name : 'Unknown'}, School: ${school ? school.name : 'Unknown'}) (${branch.is_active ? 'Active' : 'Inactive'})`);
      });
    }
    
    // Create program mappings based on enrollment patterns
    console.log('\n🎓 CREATING PROGRAM MAPPINGS...');
    
    const programMappings = {
      // Engineering programs
      'BCON': {
        school_id: '3e60ced0-41d3-4bd1-b105-6a38d22acb3c', // School of Engineering & Technology
        school_name: 'School of Engineering & Technology',
        course_id: '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', // B.Tech
        course_name: 'B.Tech',
        branch_id: '4677cb3a-8340-49e7-94ca-68e56d454607', // Computer Science & Engineering
        branch_name: 'Computer Science & Engineering'
      },
      'BCIN': {
        school_id: '3e60ced0-41d3-4bd1-b105-6a38d22acb3c',
        school_name: 'School of Engineering & Technology',
        course_id: '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
        course_name: 'B.Tech',
        branch_id: '4677cb3a-8340-49e7-94ca-68e56d454607',
        branch_name: 'Computer Science & Engineering'
      },
      'BCOM': {
        school_id: '3e60ced0-41d3-4bd1-b105-6a38d22acb3c',
        school_name: 'School of Engineering & Technology',
        course_id: '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
        course_name: 'B.Tech',
        branch_id: '4677cb3a-8340-49e7-94ca-68e56d454607',
        branch_name: 'Computer Science & Engineering'
      },
      
      // Design programs
      'BDEN': {
        school_id: 'd797703d-4af4-41c7-b4dc-96ed8332c4db', // Jaipur School of Design
        school_name: 'Jaipur School of Design',
        course_id: '194d40a3-a20c-4401-be51-ed83b0a79ca4', // B.Des
        course_name: 'B.Des',
        branch_id: 'fe1e7678-97c0-460b-98cf-bbe15844503c', // Interior Design
        branch_name: 'Interior Design'
      },
      'BVIN': {
        school_id: 'd797703d-4af4-41c7-b4dc-96ed8332c4db',
        school_name: 'Jaipur School of Design',
        course_id: '194d40a3-a20c-4401-be51-ed83b0a79ca4',
        course_name: 'B.Des',
        branch_id: 'fe1e7678-97c0-460b-98cf-bbe15844503c',
        branch_name: 'Interior Design'
      },
      
      // Business programs
      'BBAN': {
        school_id: 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b', // Jaipur School of Business
        school_name: 'Jaipur School of Business',
        course_id: 'cd5e3027-5077-4593-bb1c-0e6345291689', // BBA
        course_name: 'BBA',
        branch_id: 'f2815ac8-ecba-4453-868f-9d5a31dabd43', // General Management
        branch_name: 'General Management'
      },
      'BBAL': {
        school_id: 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b',
        school_name: 'Jaipur School of Business',
        course_id: 'cd5e3027-5077-4593-bb1c-0e6345291689',
        course_name: 'BBA',
        branch_id: 'f2815ac8-ecba-4453-868f-9d5a31dabd43',
        branch_name: 'General Management'
      },
      'MBAN': {
        school_id: 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b',
        school_name: 'Jaipur School of Business',
        course_id: 'fffc3234-e6e0-4466-891b-1acce82f143c', // MBA
        course_name: 'MBA',
        branch_id: 'f0b2b14e-8c42-406f-9805-184ca6ec6529', // Entrepreneurship
        branch_name: 'Entrepreneurship'
      },
      
      // Computer Applications programs
      'BCAN': {
        school_id: 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b', // School of Computer Applications
        school_name: 'School of Computer Applications',
        course_id: 'afe542c8-a3e9-4dac-851f-9e583e8ae125', // BCA
        course_name: 'BCA',
        branch_id: 'dcac6a77-454d-4ac3-b203-984db283692a', // Computer Applications
        branch_name: 'Computer Applications'
      },
      'BCAL': {
        school_id: 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b',
        school_name: 'School of Computer Applications',
        course_id: 'afe542c8-a3e9-4dac-851f-9e583e8ae125',
        course_name: 'BCA',
        branch_id: 'dcac6a77-454d-4ac3-b203-984db283692a',
        branch_name: 'Computer Applications'
      },
      'BCIM': {
        school_id: 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b',
        school_name: 'School of Computer Applications',
        course_id: 'afe542c8-a3e9-4dac-851f-9e583e8ae125',
        course_name: 'BCA',
        branch_id: 'dcac6a77-454d-4ac3-b203-984db283692a',
        branch_name: 'Computer Applications'
      },
      'MCAN': {
        school_id: 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b',
        school_name: 'School of Computer Applications',
        course_id: '9fd733a2-7258-45ef-a725-3854b71dc972', // MCA
        course_name: 'MCA',
        branch_id: '2dc77ff6-3dfc-400d-b7fb-1242962e66c7', // Computer Applications
        branch_name: 'Computer Applications'
      },
      'MCON': {
        school_id: 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b',
        school_name: 'School of Computer Applications',
        course_id: '9fd733a2-7258-45ef-a725-3854b71dc972',
        course_name: 'MCA',
        branch_id: '2dc77ff6-3dfc-400d-b7fb-1242962e66c7',
        branch_name: 'Computer Applications'
      },
      
      // Mass Communication programs
      'BJMN': {
        school_id: 'c393bd0d-a3b5-4aa2-b5b8-2621b99f2919', // Jaipur School of Mass Communication
        school_name: 'Jaipur School of Mass Communication',
        course_id: '60550dd6-6116-4bae-8a76-78efb55fa651', // BJMC
        course_name: 'BJMC',
        branch_id: 'c6187690-a995-4287-bbc1-65a525b18766', // Journalism & Mass Communication
        branch_name: 'Journalism & Mass Communication'
      },
      'BMIN': {
        school_id: 'c393bd0d-a3b5-4aa2-b5b8-2621b99f2919',
        school_name: 'Jaipur School of Mass Communication',
        course_id: '60550dd6-6116-4bae-8a76-78efb55fa651',
        course_name: 'BJMC',
        branch_id: 'c6187690-a995-4287-bbc1-65a525b18766',
        branch_name: 'Journalism & Mass Communication'
      }
    };
    
    console.log('Program mappings created:');
    Object.keys(programMappings).forEach(program => {
      const mapping = programMappings[program];
      console.log(`  ${program}: ${mapping.school_name} > ${mapping.course_name} > ${mapping.branch_name}`);
    });
    
    // Save mappings to file
    fs.writeFileSync(
      path.join(__dirname, '../program_mappings.json'),
      JSON.stringify(programMappings, null, 2)
    );
    
    console.log('\n💾 Program mappings saved to program_mappings.json');
    console.log('\n🎯 MAPPINGS COMPLETE! Ready to create students with correct IDs.');
    
  } catch (error) {
    console.error('💥 Error getting mappings:', error);
  }
}

getCompleteMappings();
