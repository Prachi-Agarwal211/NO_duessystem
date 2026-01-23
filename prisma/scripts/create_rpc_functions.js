const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
    }
  });
  console.log('✅ Loaded .env.local file manually');
} else {
  console.error('❌ .env.local file not found at:', envPath);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creating RPC Database Functions...');

  const dropSearchFunc = `DROP FUNCTION IF EXISTS search_student_data(TEXT);`;
  const createSearchFunc = `
    CREATE OR REPLACE FUNCTION search_student_data(p_search_term TEXT)
    RETURNS TABLE (
      registration_no TEXT,
      student_name TEXT,
      parent_name TEXT,
      admission_year TEXT,
      passing_year TEXT,
      school_id TEXT,
      course_id TEXT,
      branch_id TEXT,
      school TEXT,
      course TEXT,
      branch TEXT,
      country_code TEXT,
      contact_no TEXT,
      personal_email TEXT,
      college_email TEXT,
      no_dues_status TEXT,
      certificate_url TEXT,
      "alumniProfileLink" TEXT
    ) 
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        s.registration_no,
        s.student_name,
        s.parent_name,
        s.admission_year,
        s.passing_year,
        f.school_id,
        f.course_id,
        f.branch_id,
        s.school,
        s.course,
        s.branch,
        f.country_code,
        s.contact_no,
        s.personal_email,
        s.college_email,
        f.status,
        f.certificate_url,
        f.alumni_profile_link
      FROM student_data s
      LEFT JOIN no_dues_forms f ON s.form_id = f.id
      WHERE s.registration_no ILIKE p_search_term || '%'
         OR s.student_name ILIKE '%' || p_search_term || '%'
      LIMIT 20;
    END;
    $$;
  `;

  const dropGetFunc = `DROP FUNCTION IF EXISTS get_student_by_regno(TEXT);`;
  const createGetFunc = `
    CREATE OR REPLACE FUNCTION get_student_by_regno(p_registration_no TEXT)
    RETURNS TABLE (
      registration_no TEXT,
      student_name TEXT,
      parent_name TEXT,
      admission_year TEXT,
      passing_year TEXT,
      school_id TEXT,
      course_id TEXT,
      branch_id TEXT,
      school TEXT,
      course TEXT,
      branch TEXT,
      country_code TEXT,
      contact_no TEXT,
      personal_email TEXT,
      college_email TEXT,
      no_dues_status TEXT,
      certificate_url TEXT,
      "alumniProfileLink" TEXT
      -- Add other fields if needed by POST, currently mapped to same formData
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        s.registration_no,
        s.student_name,
        s.parent_name,
        s.admission_year,
        s.passing_year,
        f.school_id,
        f.course_id,
        f.branch_id,
        s.school,
        s.course,
        s.branch,
        f.country_code,
        s.contact_no,
        s.personal_email,
        s.college_email,
        f.status,
        f.certificate_url,
        f.alumni_profile_link
      FROM student_data s
      LEFT JOIN no_dues_forms f ON s.form_id = f.id
      WHERE s.registration_no = p_registration_no;
    END;
    $$;
  `;

  try {
    await prisma.$executeRawUnsafe(dropSearchFunc);
    console.log('✅ Dropped existing function: search_student_data');
    await prisma.$executeRawUnsafe(createSearchFunc);
    console.log('✅ Created function: search_student_data');

    await prisma.$executeRawUnsafe(dropGetFunc);
    console.log('✅ Dropped existing function: get_student_by_regno');
    await prisma.$executeRawUnsafe(createGetFunc);
    console.log('✅ Created function: get_student_by_regno');

  } catch (e) {
    console.error('❌ Error creating functions:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
