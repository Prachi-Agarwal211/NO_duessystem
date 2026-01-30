// Debug script for Staff Student API 404
// Run: node scripts/debug-staff-api.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { persistSession: false },
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
        }
    }
);

async function debugQuery() {
    const id = 'af65d6f9-174f-4d97-a970-d9b4dad7f522';

    console.log(`🔍 Debugging form query for ID: ${id}`);

    // Try without hint
    console.log('\n🔍 Testing API query WITHOUT hint...');
    const { data: full, error: fullError } = await supabaseAdmin
        .from('no_dues_forms')
        .select(`
        id,
        user_id,
        student_name,
        profiles (
          full_name,
          email
        )
      `)
        .eq('id', id)
        .single();

    if (fullError) {
        console.error('❌ Query without hint failed:', fullError);

        // Try to list columns/relationships if possible
        console.log('Attempts to find hidden FKs...');
    } else {
        console.log('✅ Query without hint succeeded:', full);
    }
}

debugQuery();
