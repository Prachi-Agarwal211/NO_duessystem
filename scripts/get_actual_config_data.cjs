// Get actual config data from database
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

async function getActualConfigData() {
  try {
    console.log('🔍 GETTING ACTUAL CONFIG DATA FROM DATABASE...\n');
    
    // Get all schools
    console.log('🏫 CONFIG_SCHOOLS:');
    const { data: schools, error: schoolsError } = await supabase
      .from('config_schools')
      .select('*')
      .order('display_order');
    
    if (schoolsError) {
      console.error('❌ Error getting schools:', schoolsError.message);
    } else {
      console.log(`Found ${schools.length} schools:`);
      schools.forEach(school => {
        console.log(`  ${school.id}: "${school.name}" (Active: ${school.is_active})`);
      });
    }
    
    // Get all courses
    console.log('\n📚 CONFIG_COURSES:');
    const { data: courses, error: coursesError } = await supabase
      .from('config_courses')
      .select('*')
      .order('display_order');
    
    if (coursesError) {
      console.error('❌ Error getting courses:', coursesError.message);
    } else {
      console.log(`Found ${courses.length} courses:`);
      courses.forEach(course => {
        const school = schools.find(s => s.id === course.school_id);
        console.log(`  ${course.id}: "${course.name}" (School: ${school ? school.name : 'Unknown'}, Active: ${course.is_active})`);
      });
    }
    
    // Get all branches
    console.log('\n🌿 CONFIG_BRANCHES:');
    const { data: branches, error: branchesError } = await supabase
      .from('config_branches')
      .select('*')
      .order('display_order');
    
    if (branchesError) {
      console.error('❌ Error getting branches:', branchesError.message);
    } else {
      console.log(`Found ${branches.length} branches:`);
      branches.forEach(branch => {
        const course = courses.find(c => c.id === branch.course_id);
        const school = course ? schools.find(s => s.id === course.school_id) : null;
        console.log(`  ${branch.id}: "${branch.name}" (Course: ${course ? course.name : 'Unknown'}, School: ${school ? school.name : 'Unknown'}, Active: ${branch.is_active})`);
      });
    }
    
    // Create program mappings based on actual data
    console.log('\n🎓 CREATING PROGRAM MAPPINGS BASED ON ACTUAL DATA...');
    
    // Find the actual IDs for common programs
    const engineeringSchool = schools.find(s => s.name.toLowerCase().includes('engineering'));
    const businessSchool = schools.find(s => s.name.toLowerCase().includes('business'));
    const computerAppsSchool = schools.find(s => s.name.toLowerCase().includes('computer applications'));
    const designSchool = schools.find(s => s.name.toLowerCase().includes('design'));
    const massCommSchool = schools.find(s => s.name.toLowerCase().includes('mass communication'));
    
    console.log('School mappings:');
    console.log(`  Engineering: ${engineeringSchool ? engineeringSchool.id : 'NOT FOUND'}`);
    console.log(`  Business: ${businessSchool ? businessSchool.id : 'NOT FOUND'}`);
    console.log(`  Computer Apps: ${computerAppsSchool ? computerAppsSchool.id : 'NOT FOUND'}`);
    console.log(`  Design: ${designSchool ? designSchool.id : 'NOT FOUND'}`);
    console.log(`  Mass Comm: ${massCommSchool ? massCommSchool.id : 'NOT FOUND'}`);
    
    // Find course IDs
    const btechCourse = courses.find(c => c.name.toLowerCase().includes('b.tech'));
    const bbaCourse = courses.find(c => c.name.toLowerCase().includes('bba'));
    const bcaCourse = courses.find(c => c.name.toLowerCase().includes('bca'));
    const mbaCourse = courses.find(c => c.name.toLowerCase().includes('mba'));
    const mcaCourse = courses.find(c => c.name.toLowerCase().includes('mca'));
    const bdesCourse = courses.find(c => c.name.toLowerCase().includes('b.des'));
    const bjmcCourse = courses.find(c => c.name.toLowerCase().includes('bjmc'));
    
    console.log('\nCourse mappings:');
    console.log(`  B.Tech: ${btechCourse ? btechCourse.id : 'NOT FOUND'}`);
    console.log(`  BBA: ${bbaCourse ? bbaCourse.id : 'NOT FOUND'}`);
    console.log(`  BCA: ${bcaCourse ? bcaCourse.id : 'NOT FOUND'}`);
    console.log(`  MBA: ${mbaCourse ? mbaCourse.id : 'NOT FOUND'}`);
    console.log(`  MCA: ${mcaCourse ? mcaCourse.id : 'NOT FOUND'}`);
    console.log(`  B.Des: ${bdesCourse ? bdesCourse.id : 'NOT FOUND'}`);
    console.log(`  BJMC: ${bjmcCourse ? bjmcCourse.id : 'NOT FOUND'}`);
    
    // Find branch IDs
    const cseBranch = branches.find(b => b.name.toLowerCase().includes('computer science'));
    const generalMgmtBranch = branches.find(b => b.name.toLowerCase().includes('general management'));
    const compAppsBranch = branches.find(b => b.name.toLowerCase().includes('computer applications'));
    const interiorDesignBranch = branches.find(b => b.name.toLowerCase().includes('interior'));
    const journalismBranch = branches.find(b => b.name.toLowerCase().includes('journalism'));
    
    console.log('\nBranch mappings:');
    console.log(`  CSE: ${cseBranch ? cseBranch.id : 'NOT FOUND'}`);
    console.log(`  General Management: ${generalMgmtBranch ? generalMgmtBranch.id : 'NOT FOUND'}`);
    console.log(`  Computer Applications: ${compAppsBranch ? compAppsBranch.id : 'NOT FOUND'}`);
    console.log(`  Interior Design: ${interiorDesignBranch ? interiorDesignBranch.id : 'NOT FOUND'}`);
    console.log(`  Journalism: ${journalismBranch ? journalismBranch.id : 'NOT FOUND'}`);
    
    // Create program mappings with actual IDs or fallback to existing ones
    const programMappings = {
      // Use existing IDs as fallback if actual ones not found
      'BCON': {
        school_id: engineeringSchool ? engineeringSchool.id : '3e60ced0-41d3-4bd1-b105-6a38d22acb3c',
        school_name: engineeringSchool ? engineeringSchool.name : 'School of Engineering & Technology',
        course_id: btechCourse ? btechCourse.id : '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
        course_name: btechCourse ? btechCourse.name : 'B.Tech',
        branch_id: cseBranch ? cseBranch.id : '4677cb3a-8340-49e7-94ca-68e56d454607',
        branch_name: cseBranch ? cseBranch.name : 'Computer Science & Engineering'
      },
      'BCIN': {
        school_id: engineeringSchool ? engineeringSchool.id : '3e60ced0-41d3-4bd1-b105-6a38d22acb3c',
        school_name: engineeringSchool ? engineeringSchool.name : 'School of Engineering & Technology',
        course_id: btechCourse ? btechCourse.id : '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
        course_name: btechCourse ? btechCourse.name : 'B.Tech',
        branch_id: cseBranch ? cseBranch.id : '4677cb3a-8340-49e7-94ca-68e56d454607',
        branch_name: cseBranch ? cseBranch.name : 'Computer Science & Engineering'
      },
      'BCOM': {
        school_id: engineeringSchool ? engineeringSchool.id : '3e60ced0-41d3-4bd1-b105-6a38d22acb3c',
        school_name: engineeringSchool ? engineeringSchool.name : 'School of Engineering & Technology',
        course_id: btechCourse ? btechCourse.id : '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
        course_name: btechCourse ? btechCourse.name : 'B.Tech',
        branch_id: cseBranch ? cseBranch.id : '4677cb3a-8340-49e7-94ca-68e56d454607',
        branch_name: cseBranch ? cseBranch.name : 'Computer Science & Engineering'
      },
      'BBAN': {
        school_id: businessSchool ? businessSchool.id : 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b',
        school_name: businessSchool ? businessSchool.name : 'Jaipur School of Business',
        course_id: bbaCourse ? bbaCourse.id : 'cd5e3027-5077-4593-bb1c-0e6345291689',
        course_name: bbaCourse ? bbaCourse.name : 'BBA',
        branch_id: generalMgmtBranch ? generalMgmtBranch.id : 'f2815ac8-ecba-4453-868f-9d5a31dabd43',
        branch_name: generalMgmtBranch ? generalMgmtBranch.name : 'General Management'
      },
      'BCAN': {
        school_id: computerAppsSchool ? computerAppsSchool.id : 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b',
        school_name: computerAppsSchool ? computerAppsSchool.name : 'School of Computer Applications',
        course_id: bcaCourse ? bcaCourse.id : 'afe542c8-a3e9-4dac-851f-9e583e8ae125',
        course_name: bcaCourse ? bcaCourse.name : 'BCA',
        branch_id: compAppsBranch ? compAppsBranch.id : 'dcac6a77-454d-4ac3-b203-984db283692a',
        branch_name: compAppsBranch ? compAppsBranch.name : 'Computer Applications'
      },
      'MBAN': {
        school_id: businessSchool ? businessSchool.id : 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b',
        school_name: businessSchool ? businessSchool.name : 'Jaipur School of Business',
        course_id: mbaCourse ? mbaCourse.id : 'fffc3234-e6e0-4466-891b-1acce82f143c',
        course_name: mbaCourse ? mbaCourse.name : 'MBA',
        branch_id: generalMgmtBranch ? generalMgmtBranch.id : 'f0b2b14e-8c42-406f-9805-184ca6ec6529',
        branch_name: generalMgmtBranch ? generalMgmtBranch.name : 'Entrepreneurship'
      },
      'MCAN': {
        school_id: computerAppsSchool ? computerAppsSchool.id : 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b',
        school_name: computerAppsSchool ? computerAppsSchool.name : 'School of Computer Applications',
        course_id: mcaCourse ? mcaCourse.id : '9fd733a2-7258-45ef-a725-3854b71dc972',
        course_name: mcaCourse ? mcaCourse.name : 'MCA',
        branch_id: compAppsBranch ? compAppsBranch.id : '2dc77ff6-3dfc-400d-b7fb-1242962e66c7',
        branch_name: compAppsBranch ? compAppsBranch.name : 'Computer Applications'
      },
      'BDEN': {
        school_id: designSchool ? designSchool.id : 'd797703d-4af4-41c7-b4dc-96ed8332c4db',
        school_name: designSchool ? designSchool.name : 'Jaipur School of Design',
        course_id: bdesCourse ? bdesCourse.id : '194d40a3-a20c-4401-be51-ed83b0a79ca4',
        course_name: bdesCourse ? bdesCourse.name : 'B.Des',
        branch_id: interiorDesignBranch ? interiorDesignBranch.id : 'fe1e7678-97c0-460b-98cf-bbe15844503c',
        branch_name: interiorDesignBranch ? interiorDesignBranch.name : 'Interior Design'
      },
      'BVIN': {
        school_id: designSchool ? designSchool.id : 'd797703d-4af4-41c7-b4dc-96ed8332c4db',
        school_name: designSchool ? designSchool.name : 'Jaipur School of Design',
        course_id: bdesCourse ? bdesCourse.id : '194d40a3-a20c-4401-be51-ed83b0a79ca4',
        course_name: bdesCourse ? bdesCourse.name : 'B.Des',
        branch_id: interiorDesignBranch ? interiorDesignBranch.id : 'fe1e7678-97c0-460b-98cf-bbe15844503c',
        branch_name: interiorDesignBranch ? interiorDesignBranch.name : 'Interior Design'
      },
      'BJMN': {
        school_id: massCommSchool ? massCommSchool.id : 'c393bd0d-a3b5-4aa2-b5b8-2621b99f2919',
        school_name: massCommSchool ? massCommSchool.name : 'Jaipur School of Mass Communication',
        course_id: bjmcCourse ? bjmcCourse.id : '60550dd6-6116-4bae-8a76-78efb55fa651',
        course_name: bjmcCourse ? bjmcCourse.name : 'BJMC',
        branch_id: journalismBranch ? journalismBranch.id : 'c6187690-a995-4287-bbc1-65a525b18766',
        branch_name: journalismBranch ? journalismBranch.name : 'Journalism & Mass Communication'
      }
    };
    
    // Add missing programs with fallbacks
    const additionalPrograms = ['BCIM', 'BMIN', 'BBAL', 'BCAL', 'MCON'];
    additionalPrograms.forEach(program => {
      if (!programMappings[program]) {
        // Use similar program mappings
        if (program.startsWith('BC')) {
          programMappings[program] = programMappings['BCAN']; // Use BCA mapping
        } else if (program.startsWith('M')) {
          programMappings[program] = programMappings['MCAN']; // Use MCA mapping
        }
      }
    });
    
    // Save the complete mappings
    const completeData = {
      schools,
      courses,
      branches,
      programMappings
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../actual_database_config.json'),
      JSON.stringify(completeData, null, 2)
    );
    
    console.log('\n💾 Complete config data saved to actual_database_config.json');
    console.log('\n🎯 ACTUAL CONFIG DATA RETRIEVAL COMPLETE!');
    console.log('Ready to create students with REAL database IDs!');
    
  } catch (error) {
    console.error('💥 Error getting actual config data:', error);
  }
}

getActualConfigData();
