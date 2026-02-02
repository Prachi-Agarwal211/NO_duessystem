import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin as supabase } from '../src/lib/supabaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update completed students status in database
async function updateCompletedStudents() {
  try {
    console.log('🚀 Starting update of completed students...');
    
    // Load completed students from JSON
    const completedStudentsFile = path.join(__dirname, '../completed_students.json');
    const completedStudents = JSON.parse(fs.readFileSync(completedStudentsFile, 'utf8'));
    
    console.log(`📋 Found ${completedStudents.length} completed students to update`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process students in batches to avoid overwhelming the database
    const batchSize = 10;
    
    for (let i = 0; i < completedStudents.length; i += batchSize) {
      const batch = completedStudents.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(completedStudents.length/batchSize)}...`);
      
      for (const enrollmentNo of batch) {
        try {
          // Update the student's status to 'completed'
          const { data, error } = await supabase
            .from('no_dues_forms')
            .update({ 
              status: 'completed',
              final_certificate_generated: true,
              updated_at: new Date().toISOString()
            })
            .eq('registration_no', enrollmentNo)
            .select();
          
          if (error) {
            console.error(`❌ Error updating ${enrollmentNo}:`, error.message);
            errorCount++;
            errors.push({ enrollmentNo, error: error.message });
          } else if (data && data.length > 0) {
            console.log(`✅ Updated ${enrollmentNo} to completed status`);
            successCount++;
          } else {
            console.log(`⚠️  No record found for ${enrollmentNo}`);
            errorCount++;
            errors.push({ enrollmentNo, error: 'No record found' });
          }
        } catch (err) {
          console.error(`💥 Unexpected error for ${enrollmentNo}:`, err.message);
          errorCount++;
          errors.push({ enrollmentNo, error: err.message });
        }
      }
      
      // Small delay between batches to be gentle on the database
      if (i + batchSize < completedStudents.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Successfully updated: ${successCount} students`);
    console.log(`❌ Failed updates: ${errorCount} students`);
    
    if (errors.length > 0) {
      console.log('\n🔍 ERRORS:');
      errors.forEach(({ enrollmentNo, error }) => {
        console.log(`  ${enrollmentNo}: ${error}`);
      });
      
      // Save errors to file for review
      fs.writeFileSync(
        path.join(__dirname, '../update_errors.json'),
        JSON.stringify(errors, null, 2)
      );
      console.log('\n💾 Errors saved to update_errors.json');
    }
    
    // Save success summary
    const summary = {
      totalProcessed: completedStudents.length,
      successCount,
      errorCount,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../update_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n🎉 Update completed!');
    console.log(`📄 Summary saved to update_summary.json`);
    
  } catch (error) {
    console.error('💥 Fatal error during update:', error);
    process.exit(1);
  }
}

// Verify the updates by checking current status
async function verifyUpdates() {
  try {
    console.log('\n🔍 Verifying updates...');
    
    const completedStudentsFile = path.join(__dirname, '../completed_students.json');
    const completedStudents = JSON.parse(fs.readFileSync(completedStudentsFile, 'utf8'));
    
    let verifiedCount = 0;
    let pendingCount = 0;
    
    for (const enrollmentNo of completedStudents) {
      const { data, error } = await supabase
        .from('no_dues_forms')
        .select('status, final_certificate_generated')
        .eq('registration_no', enrollmentNo)
        .single();
      
      if (data) {
        if (data.status === 'completed' && data.final_certificate_generated === true) {
          verifiedCount++;
        } else {
          pendingCount++;
          console.log(`⚠️  ${enrollmentNo} - Status: ${data.status}, Certificate: ${data.final_certificate_generated}`);
        }
      }
    }
    
    console.log(`\n✅ Verified completed: ${verifiedCount}`);
    console.log(`⚠️  Still pending: ${pendingCount}`);
    
  } catch (error) {
    console.error('💥 Error during verification:', error);
  }
}

// Main execution
async function main() {
  await updateCompletedStudents();
  await verifyUpdates();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updateCompletedStudents, verifyUpdates };
