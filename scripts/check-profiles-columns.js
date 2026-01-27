const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfilesColumns() {
    console.log('🔍 CHECKING PROFILES TABLE COLUMNS...\n');

    try {
        // Try to select specific columns from profiles
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, last_active_at')
            .limit(1);

        if (error) {
            console.error('❌ ERROR: Cannot query profiles table');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
            console.error('Error Details:', error.details);
            return;
        }

        console.log('✅ Successfully queried profiles with last_active_at');
        console.log('Sample data:', data);

        // Now try to update last_active_at
        const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', data[0]?.id)
            .select();

        if (updateError) {
            console.error('\n❌ ERROR: Cannot update last_active_at');
            console.error('Error Code:', updateError.code);
            console.error('Error Message:', updateError.message);
        } else {
            console.log('\n✅ Successfully updated last_active_at');
            console.log('Updated data:', updateData);
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

checkProfilesColumns();
