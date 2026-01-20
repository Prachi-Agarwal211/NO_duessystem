import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Common Excel column name variations to database field mapping
const COMMON_EXCEL_MAPPINGS = {
  // Registration Number variations
  'registration_no': ['reg no', 'registration no', 'reg_no', 'registration', 'reg number', 'roll no', 'roll number', 'enrollment no', 'enrollment number'],
  
  // Student Name variations
  'student_name': ['name', 'student name', 'full name', 'student', 'candidate name', 'applicant name'],
  
  // School variations
  'school': ['school', 'department', 'faculty', 'college', 'institution', 'program'],
  
  // Course variations
  'course': ['course', 'program', 'degree', 'stream', 'specialization', 'branch'],
  
  // Branch variations
  'branch': ['branch', 'specialization', 'concentration', 'major', 'discipline'],
  
  // Academic Year variations
  'admission_year': ['admission year', 'admission yr', 'join year', 'entry year', 'batch year'],
  'passing_year': ['passing year', 'passing yr', 'graduation year', 'completion year', 'final year'],
  
  // Contact variations
  'contact_no': ['contact no', 'phone', 'mobile', 'telephone', 'contact number', 'phone no'],
  'personal_email': ['personal email', 'email', 'email id', 'mail', 'personal mail'],
  'college_email': ['college email', 'official email', 'institution email', 'college mail'],
  
  // Parent variations
  'parent_name': ['parent name', 'father name', 'mother name', 'guardian name', 'parent'],
  
  // Additional fields
  'cgpa': ['cgpa', 'gpa', 'grade', 'percentage', 'marks'],
  'batch': ['batch', 'class', 'section', 'group'],
  'semester': ['semester', 'sem', 'term'],
  'address': ['address', 'residential address', 'home address', 'permanent address'],
  'city': ['city', 'town', 'location'],
  'state': ['state', 'region', 'province'],
  'pin_code': ['pin code', 'postal code', 'zipcode', 'zip'],
  'gender': ['gender', 'sex'],
  'category': ['category', 'caste', 'community', 'reservation'],
  'blood_group': ['blood group', 'blood type', 'blood']
};

async function getSchoolCourseBranchMapping() {
  try {
    // Get all schools
    const { data: schools } = await supabase
      .from('config_schools')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order');
    
    // Get all courses
    const { data: courses } = await supabase
      .from('config_courses')
      .select('id, name, school_id')
      .eq('is_active', true)
      .order('display_order');
    
    // Get all branches
    const { data: branches } = await supabase
      .from('config_branches')
      .select('id, name, course_id')
      .eq('is_active', true)
      .order('display_order');
    
    return { schools, courses, branches };
  } catch (error) {
    console.error('Error fetching mapping data:', error.message);
    return { schools: [], courses: [], branches: [] };
  }
}

function normalizeString(str) {
  return str.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function findBestMatch(excelValue, options, type) {
  if (!excelValue || !options.length) return null;
  
  const normalizedExcel = normalizeString(excelValue);
  
  // Try exact match first
  for (const option of options) {
    if (normalizeString(option.name) === normalizedExcel) {
      return option;
    }
  }
  
  // Try partial match
  for (const option of options) {
    if (normalizedExcel.includes(normalizeString(option.name)) || 
        normalizeString(option.name).includes(normalizedExcel)) {
      return option;
    }
  }
  
  // Try common variations
  const variations = COMMON_EXCEL_MAPPINGS[type] || [];
  for (const variation of variations) {
    if (normalizedExcel === variation) {
      return options[0]; // Return first option as fallback
    }
  }
  
  return null;
}

function mapExcelToDatabase(excelRow, { schools, courses, branches }) {
  const mapped = {};
  
  // Map school
  const schoolMatch = findBestMatch(excelRow.school || excelRow.School || excelRow.SCHOOL, schools, 'school');
  if (schoolMatch) {
    mapped.school_id = schoolMatch.id;
    mapped.school = schoolMatch.name;
  }
  
  // Map course (only if school is found)
  if (mapped.school_id) {
    const schoolCourses = courses.filter(c => c.school_id === mapped.school_id);
    const courseMatch = findBestMatch(excelRow.course || excelRow.Course || excelRow.COURSE, schoolCourses, 'course');
    if (courseMatch) {
      mapped.course_id = courseMatch.id;
      mapped.course = courseMatch.name;
    }
  }
  
  // Map branch (only if course is found)
  if (mapped.course_id) {
    const courseBranches = branches.filter(b => b.course_id === mapped.course_id);
    const branchMatch = findBestMatch(excelRow.branch || excelRow.Branch || excelRow.BRANCH, courseBranches, 'branch');
    if (branchMatch) {
      mapped.branch_id = branchMatch.id;
      mapped.branch = branchMatch.name;
    }
  }
  
  // Map other fields with common variations
  Object.keys(COMMON_EXCEL_MAPPINGS).forEach(dbField => {
    const variations = COMMON_EXCEL_MAPPINGS[dbField];
    
    for (const variation of variations) {
      const excelValue = excelRow[variation] || 
                        excelRow[variation.toUpperCase()] || 
                        excelRow[variation.toLowerCase()] ||
                        excelRow[variation.replace(/[^a-z]/g, '')];
      
      if (excelValue && !mapped[dbField]) {
        mapped[dbField] = excelValue;
        break;
      }
    }
  });
  
  return mapped;
}

async function generateMappingTemplate() {
  const { schools, courses, branches } = await getSchoolCourseBranchMapping();
  
  console.log('📋 EXCEL TO DATABASE MAPPING GUIDE\n');
  console.log('=====================================\n');
  
  console.log('🏫 AVAILABLE SCHOOLS:');
  schools.forEach(s => console.log(`  "${s.name}"`));
  
  console.log('\n📚 AVAILABLE COURSES:');
  courses.forEach(c => console.log(`  "${c.name}" (School: ${schools.find(s => s.id === c.school_id)?.name})`));
  
  console.log('\n🌿 AVAILABLE BRANCHES:');
  branches.forEach(b => {
    const course = courses.find(c => c.id === b.course_id);
    const school = schools.find(s => s.id === course?.school_id);
    console.log(`  "${b.name}" (Course: ${course?.name}, School: ${school?.name})`);
  });
  
  console.log('\n📝 COMMON EXCEL COLUMN VARIATIONS:');
  Object.entries(COMMON_EXCEL_MAPPINGS).forEach(([dbField, variations]) => {
    console.log(`  ${dbField}: ${variations.join(', ')}`);
  });
  
  console.log('\n🔧 MAPPING EXAMPLE:');
  console.log('Excel columns like "Reg No", "Student Name", "School", "Course", "Branch"');
  console.log('will be automatically mapped to database fields.');
  
  return { schools, courses, branches };
}

// Export functions for use in import scripts
export {
  getSchoolCourseBranchMapping,
  normalizeString,
  findBestMatch,
  mapExcelToDatabase,
  COMMON_EXCEL_MAPPINGS
};

// Run if called directly
generateMappingTemplate();
