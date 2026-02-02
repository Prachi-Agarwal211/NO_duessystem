import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract completed student enrollment numbers from email subjects audit
function extractCompletedStudents() {
  const emailFile = path.join(__dirname, '../email_subjects_audit.txt');
  const content = fs.readFileSync(emailFile, 'utf8');
  
  const completedStudents = [];
  const lines = content.split('\n');
  
  lines.forEach(line => {
    if (line.includes('🎓 Certificate Ready:')) {
      const enrollmentNo = line.split('🎓 Certificate Ready: ')[1].trim();
      if (enrollmentNo) {
        completedStudents.push(enrollmentNo);
      }
    }
  });
  
  console.log(`Found ${completedStudents.length} completed students:`);
  console.log(completedStudents);
  
  // Save to JSON file for further processing
  fs.writeFileSync(
    path.join(__dirname, '../completed_students.json'),
    JSON.stringify(completedStudents, null, 2)
  );
  
  return completedStudents;
}

extractCompletedStudents();
