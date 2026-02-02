import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
function loadEnv() {
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
    console.log('✅ Environment variables loaded from .env.local');
  } else {
    console.error('❌ .env.local file not found');
    process.exit(1);
  }
}

// Initialize Supabase client
function initSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Update completed students status in database
async function updateCompletedStudents() {
  try {
    console.log('🚀 Starting update of completed students...');
    
    // Load environment variables
    loadEnv();
    
    // Initialize Supabase
    const supabase = initSupabase();
    
    // Load completed students from JSON
    const completedStudentsFile = path.join(__dirname, '../completed_students.json');
    const completedStudents = JSON.parse(fs.readFileSync(completedStudentsFile, 'utf8'));
    
    console.log(`📋 Found ${completedStudents.length} completed students to update`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process students in batches
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
      
      // Small delay between batches
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
      
      // Save errors to file
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

// Verify the updates
async function verifyUpdates() {
  try {
    console.log('\n🔍 Verifying updates...');
    
    loadEnv();
    const supabase = initSupabase();
    
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
