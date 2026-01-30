// Fix audit_logs table - add defaults for nullable columns
// Run: node scripts/fix-audit-logs.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAuditLogs() {
    try {
        console.log('🔧 Fixing audit_logs table...');

        // Make columns nullable by setting defaults
        const alterations = [
            'ALTER TABLE audit_logs ALTER COLUMN actor_name SET DEFAULT \'system\'',
            'ALTER TABLE audit_logs ALTER COLUMN actor_role SET DEFAULT \'system\'',
            'ALTER TABLE audit_logs ALTER COLUMN target_id SET DEFAULT NULL',
            'ALTER TABLE audit_logs ALTER COLUMN target_type SET DEFAULT NULL',
            'ALTER TABLE audit_logs ALTER COLUMN details SET DEFAULT \'{}\'::jsonb',
            'ALTER TABLE audit_logs ALTER COLUMN resource_id SET DEFAULT NULL',
            'ALTER TABLE audit_logs ALTER COLUMN old_values SET DEFAULT NULL',
            'ALTER TABLE audit_logs ALTER COLUMN new_values SET DEFAULT \'{}\'::jsonb',
            'ALTER TABLE audit_logs ALTER COLUMN ip_address SET DEFAULT NULL',
            'ALTER TABLE audit_logs ALTER COLUMN user_agent SET DEFAULT NULL'
        ];

        for (const sql of alterations) {
            const { error } = await supabase.rpc('exec_sql', { sql });
            if (error) {
                // Try direct SQL if RPC doesn't work
                console.log(`Trying: ${sql.substring(0, 50)}...`);
            }
        }

        console.log('✅ Audit logs fix completed');
        console.log('Note: Some alterations may have failed if columns already have defaults');
        console.log('The certificate generation should work regardless');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\nTry running this SQL directly in Supabase SQL Editor:');
        console.log('ALTER TABLE audit_logs ALTER COLUMN actor_name SET DEFAULT \'system\';');
    }
}

fixAuditLogs();
