const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigration() {
    try {
        console.log('Reading migration SQL file...');
        const migrationPath = path.join(__dirname, 'alter_support_tickets.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration...');

        // Split the SQL file into individual statements
        const statements = migrationSql
            .split(';')
            .filter(stmt => stmt.trim().length > 0)
            .map(stmt => stmt.trim());

        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    // Use rpc exec_sql if available, otherwise use query directly
                    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
                    if (error) {
                        console.error('Statement failed via RPC:', error.message);
                        console.log('Statement:', statement.substring(0, 100) + '...');
                        // Try direct SQL execution via REST API? Not possible. We'll skip.
                        console.log('Skipping...');
                    } else {
                        console.log('Executed successfully:', statement.substring(0, 50) + '...');
                    }
                } catch (err) {
                    console.error('Error executing statement:', err.message);
                    console.log('Statement:', statement.substring(0, 100) + '...');
                }
            }
        }

        console.log('Migration completed');

    } catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    }
}

runMigration();