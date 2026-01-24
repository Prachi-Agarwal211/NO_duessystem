/**
 * Debug exact API Response format
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAPIResponse() {
    console.log('🔍 Debugging API Response Structure...\n');

    try {
        const { data: schools } = await supabase.from('config_schools').select('id, name').eq('is_active', true);
        const { data: courses } = await supabase.from('config_courses').select('id, school_id, name').eq('is_active', true);
        const { data: branches } = await supabase.from('config_branches').select('id, course_id, name').eq('is_active', true);

        const responseData = {
            success: true,
            data: {
                schools: schools || [],
                courses: courses || [],
                branches: branches || [],
                collegeDomain: 'jecrcu.edu.in'
            }
        };

        console.log('--- START JSON ---');
        console.log(JSON.stringify(responseData, null, 2));
        console.log('--- END JSON ---');

        // Check for specific fields frontend uses
        if (schools.length > 0) {
            const s = schools[0];
            console.log(`\nSample School: id=${s.id} (${typeof s.id}), name=${s.name}`);
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

debugAPIResponse();
