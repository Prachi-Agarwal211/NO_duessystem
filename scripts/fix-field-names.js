/**
 * Script to replace session_from/session_to with admission_year/passing_year
 * across the entire codebase
 * 
 * Run: node scripts/fix-field-names.js
 */

const fs = require('fs');
const path = require('path');

// Files to update (based on search results)
const filesToUpdate = [
  'src/components/student/SubmitForm.jsx',
  'src/components/student/ReapplyModal.jsx',
  'src/components/admin/ManualEntriesTable.jsx',
  'src/app/api/student/route.js',
  'src/app/api/student/edit/route.js',
  'src/app/api/student/certificate/route.js',
  'src/app/api/student/reapply/route.js',
  'src/app/api/staff/student/[id]/route.js',
  'src/app/api/certificate/verify/route.js',
  'src/app/student/check-status/page.js',
  'src/app/staff/student/[id]/page.js',
  'src/app/admin/request/[id]/page.js',
  'src/lib/validation.js',
  'src/lib/sanitization.js',
  'src/lib/certificateService.js'
];

// Replacement mappings
const replacements = [
  // Variable names
  { from: /session_from/g, to: 'admission_year' },
  { from: /session_to/g, to: 'passing_year' },
  
  // Display text
  { from: /'Session From'/g, to: "'Admission Year'" },
  { from: /'Session To'/g, to: "'Passing Year'" },
  { from: /"Session From"/g, to: '"Admission Year"' },
  { from: /"Session To"/g, to: '"Passing Year"' },
  { from: /label="Admission Year \(YYYY\)"/g, to: 'label="Admission Year"' },
  { from: /label="Passing Year \(YYYY\)"/g, to: 'label="Passing Year"' },
  
  // Comments
  { from: /\/\/ Now represents admission_year/g, to: '// Admission year' },
  { from: /\/\/ Now represents passing_year/g, to: '// Passing year' },
  { from: /session year/gi, to: (match) => match.charAt(0) === 's' ? 'year' : 'Year' },
  
  // Certificate text
  { from: /sessionFrom/g, to: 'admissionYear' },
  { from: /sessionTo/g, to: 'passingYear' }
];

function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Apply all replacements
    replacements.forEach(({ from, to }) => {
      content = content.replace(from, to);
    });
    
    // Check if anything changed
    if (content === originalContent) {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
    
    // Write updated content
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('\n🔄 Replacing session_from/session_to with admission_year/passing_year\n');
  console.log(`Updating ${filesToUpdate.length} files...\n`);
  
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  
  filesToUpdate.forEach(file => {
    const result = updateFile(file);
    if (result === true) updated++;
    else if (result === false) skipped++;
    else failed++;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated} files`);
  console.log(`⏭️  Skipped: ${skipped} files (no changes needed)`);
  console.log(`❌ Failed: ${failed} files`);
  console.log('='.repeat(60));
  
  if (updated > 0) {
    console.log('\n✨ Field name migration complete!');
    console.log('\n⚠️  IMPORTANT: Test the application thoroughly:');
    console.log('   1. Form submission with admission/passing years');
    console.log('   2. Form editing');
    console.log('   3. Status checking');
    console.log('   4. Certificate generation');
    console.log('   5. Admin/Staff dashboards\n');
  }
}

main();