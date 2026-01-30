
const fs = require('fs');
const path = require('path');

// Try .env.local first
if (fs.existsSync(path.resolve('.env.local'))) {
    require('dotenv').config({ path: '.env.local' });
} else {
    // Fallback to .env
    require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Checked .env.local and .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFormsSchema() {
    console.log('Checking no_dues_forms schema...');

    // Try to select the specific columns we suspect might be missing
    const { data, error } = await supabase
        .from('no_dues_forms')
        .select('id, reapplication_count, student_reply_message, last_reapplied_at')
        .limit(1);

    if (error) {
        console.error('❌ Columns ERROR:', error.message);
    } else {
        console.log('✅ Columns exist. Sample:', data);
    }
}

checkFormsSchema();
