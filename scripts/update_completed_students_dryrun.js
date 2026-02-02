import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dry run version - shows what would be updated without actually doing it
async function dryRunUpdate() {
  try {
    console.log('🔍 DRY RUN: Showing what would be updated...');
    
    // Load completed students from JSON
    const completedStudentsFile = path.join(__dirname, '../completed_students.json');
    const completedStudents = JSON.parse(fs.readFileSync(completedStudentsFile, 'utf8'));
    
    console.log(`📋 Found ${completedStudents.length} completed students to update`);
    
    // Generate SQL statements for manual execution
    const sqlStatements = [];
    
    completedStudents.forEach((enrollmentNo, index) => {
      const sql = `UPDATE no_dues_forms 
SET status = 'completed', 
    final_certificate_generated = true, 
    updated_at = NOW() 
WHERE registration_no = '${enrollmentNo}';`;
      
      sqlStatements.push(sql);
      
      if (index < 10) {
        console.log(`\n${index + 1}. ${enrollmentNo}:`);
        console.log(`   SQL: ${sql}`);
      }
    });
    
    if (completedStudents.length > 10) {
      console.log(`\n... and ${completedStudents.length - 10} more updates`);
    }
    
    // Save all SQL statements to file
    fs.writeFileSync(
      path.join(__dirname, '../update_completed_students.sql'),
      sqlStatements.join('\n\n')
    );
    
    console.log(`\n💾 All SQL statements saved to update_completed_students.sql`);
    console.log('\n📋 SUMMARY:');
    console.log(`📝 Total SQL statements generated: ${sqlStatements.length}`);
    console.log(`👥 Students to be updated: ${completedStudents.length}`);
    
    // Create a summary report
    const summary = {
      totalStudents: completedStudents.length,
      sqlFile: 'update_completed_students.sql',
      generatedAt: new Date().toISOString(),
      students: completedStudents
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../dry_run_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`📄 Dry run summary saved to dry_run_summary.json`);
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Review the SQL statements in update_completed_students.sql');
    console.log('2. Execute the SQL in your Supabase dashboard or via psql');
    console.log('3. Run the verification script to confirm updates');
    
  } catch (error) {
    console.error('💥 Error during dry run:', error);
  }
}

// Generate verification queries
function generateVerificationQueries() {
  const completedStudentsFile = path.join(__dirname, '../completed_students.json');
  const completedStudents = JSON.parse(fs.readFileSync(completedStudentsFile, 'utf8'));
  
  // Create IN clause for all enrollment numbers
  const enrollmentList = completedStudents.map(no => `'${no}'`).join(', ');
  
  const verificationSQL = `
-- Verification Query 1: Count completed students
SELECT 
  COUNT(*) as total_completed,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as marked_completed,
  COUNT(CASE WHEN final_certificate_generated = true THEN 1 END) as certificates_generated
FROM no_dues_forms 
WHERE registration_no IN (${enrollmentList});

-- Verification Query 2: Show students still not marked as completed
SELECT registration_no, status, final_certificate_generated, updated_at
FROM no_dues_forms 
WHERE registration_no IN (${enrollmentList})
AND status != 'completed'
ORDER BY registration_no;

-- Verification Query 3: Overall dashboard stats
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM no_dues_forms), 2) as percentage
FROM no_dues_forms 
GROUP BY status
ORDER BY count DESC;
`;
  
  fs.writeFileSync(
    path.join(__dirname, '../verification_queries.sql'),
    verificationSQL
  );
  
  console.log('🔍 Verification queries saved to verification_queries.sql');
}

// Main execution
async function main() {
  await dryRunUpdate();
  generateVerificationQueries();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { dryRunUpdate, generateVerificationQueries };
