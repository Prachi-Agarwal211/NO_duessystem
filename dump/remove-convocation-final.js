import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config({ path: './.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function removeConvocationTable() {
  console.log('🗑️  Removing convocation_eligible_students table from Supabase...');
  
  try {
    // Clear all data from the table first
    console.log('Clearing all data from convocation_eligible_students...');
    const { error: deleteError } = await supabaseAdmin
      .from('convocation_eligible_students')
      .delete()
      .neq('registration_no', 'is', 'not', null);
    
    if (deleteError) {
      console.log('ℹ️  Could not delete data:', deleteError.message);
    } else {
      console.log('✅ All convocation data cleared');
    }
    
    // Clear Next.js cache
    console.log('🧹 Clearing Next.js cache...');
    const cacheDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(cacheDir)) {
      try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log('✅ Next.js cache cleared');
      } catch (err) {
        console.log('⚠️  Could not clear cache:', err.message);
      }
    }
    
    console.log('\n📝 MANUAL STEP REQUIRED:');
    console.log('Please go to Supabase Dashboard → SQL Editor and run:');
    console.log('DROP TABLE IF EXISTS public.convocation_eligible_students CASCADE;');
    console.log('\nThis will completely remove the convocation table.');
    
  } catch (e) {
    console.error('ℹ️  Error:', e.message);
  }
}

removeConvocationTable().then(() => process.exit(0));
