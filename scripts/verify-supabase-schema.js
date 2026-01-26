/**
 * SCHEMA VERIFICATION SCRIPT
 * Run this to check what columns/tables are missing in Supabase
 * 
 * Usage: node scripts/verify-supabase-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const expectedTables = {
    'no_dues_forms': {
        'id': 'uuid',
        'registration_no': 'text',
        'student_name': 'text',
        'parent_name': 'text',
        'school_id': 'uuid',
        'school': 'text',
        'course_id': 'uuid',
        'course': 'text',
        'branch_id': 'uuid',
        'branch': 'text',
        'country_code': 'text',
        'contact_no': 'text',
        'personal_email': 'text',
        'college_email': 'text',
        'admission_year': 'text',
        'passing_year': 'text',
        'alumni_profile_link': 'text',
        'status': 'text',
        'rejection_reason': 'text',
        'is_reapplication': 'boolean',
        'reapplication_count': 'integer',
        'last_reapplied_at': 'timestamptz',
        'student_reply_message': 'text',
        'rejection_context': 'jsonb',
        'unread_count': 'integer',
        'department_unread_counts': 'jsonb',
        'final_certificate_generated': 'boolean',
        'certificate_url': 'text',
        'certificate_generated_at': 'timestamptz',
        'created_at': 'timestamptz',
        'updated_at': 'timestamptz'
    },
    'no_dues_status': {
        'id': 'uuid',
        'form_id': 'uuid',
        'department_name': 'text',
        'status': 'text',
        'action_at': 'timestamptz',
        'action_by': 'text',
        'remarks': 'text',
        'rejection_reason': 'text',
        'student_reply_message': 'text',
        'unread_count': 'integer',
        'created_at': 'timestamptz',
        'updated_at': 'timestamptz'
    },
    'no_dues_reapplication_history': {
        'id': 'uuid',
        'form_id': 'uuid',
        'reapplication_number': 'integer',
        'department_name': 'text',
        'reapplication_reason': 'text',
        'student_reply_message': 'text',
        'edited_fields': 'jsonb',
        'previous_status': 'jsonb',
        'created_at': 'timestamptz',
        'updated_at': 'timestamptz'
    },
    'no_dues_messages': {
        'id': 'uuid',
        'form_id': 'uuid',
        'department_name': 'text',
        'message': 'text',
        'sender_type': 'text',
        'sender_name': 'text',
        'sender_id': 'text',
        'is_read': 'boolean',
        'read_at': 'timestamptz',
        'created_at': 'timestamptz'
    },
    'support_tickets': {
        'id': 'uuid',
        'form_id': 'uuid',
        'student_name': 'text',
        'student_email': 'text',
        'registration_no': 'text',
        'category': 'text',
        'subject': 'text',
        'description': 'text',
        'priority': 'text',
        'status': 'text',
        'assigned_to': 'text',
        'resolution_notes': 'text',
        'created_at': 'timestamptz',
        'updated_at': 'timestamptz',
        'resolved_at': 'timestamptz'
    },
    'student_data': {
        'id': 'uuid',
        'registration_no': 'text',
        'roll_number': 'text',
        'enrollment_number': 'text',
        'student_name': 'text',
        'parent_name': 'text',
        'school_id': 'uuid',
        'school': 'text',
        'course_id': 'uuid',
        'course': 'text',
        'branch_id': 'uuid',
        'branch': 'text',
        'country_code': 'text',
        'contact_no': 'text',
        'personal_email': 'text',
        'college_email': 'text',
        'admission_year': 'text',
        'passing_year': 'text',
        'batch': 'text',
        'section': 'text',
        'semester': 'integer',
        'cgpa': 'numeric',
        'date_of_birth': 'date',
        'gender': 'text',
        'category': 'text',
        'blood_group': 'text',
        'address': 'text',
        'city': 'text',
        'state': 'text',
        'pin_code': 'text',
        'emergency_contact_name': 'text',
        'emergency_contact_no': 'text',
        'alumni_profile_link': 'text',
        'form_id': 'uuid',
        'created_at': 'timestamptz',
        'updated_at': 'timestamptz',
        'updated_by': 'text'
    }
};

async function verifySchema() {
    console.log('🔍 Connecting to Supabase...\n');
    console.log(`   URL: ${supabaseUrl}\n`);

    const results = {
        missingColumns: {},
        extraColumns: {},
        tablesFound: [],
        tablesMissing: []
    };

    for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
        console.log(`📋 Checking table: ${tableName}`);

        try {
            // Try to query the table
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

            if (error && error.code !== 'PGRST116') {
                console.log(`   ❌ Error: ${error.message}`);
                results.tablesMissing.push(tableName);
                continue;
            }

            results.tablesFound.push(tableName);

            // Get actual columns using information_schema
            const { data: columns } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type')
                .eq('table_schema', 'public')
                .eq('table_name', tableName);

            const actualColumns = {};
            columns?.forEach(col => {
                actualColumns[col.column_name] = col.data_type;
            });

            const expectedColumnNames = Object.keys(expectedColumns);
            const actualColumnNames = Object.keys(actualColumns);

            // Find missing columns
            const missing = expectedColumnNames.filter(c => !actualColumnNames.includes(c));

            // Find extra columns (but only flag unexpected ones)
            const extra = actualColumnNames.filter(c => !expectedColumnNames.includes(c));

            if (missing.length > 0) {
                console.log(`   ⚠️  Missing columns (${missing.length}):`);
                missing.forEach(col => {
                    console.log(`      - ${col} (${expectedColumns[col]})`);
                });
                results.missingColumns[tableName] = missing;
            } else {
                console.log(`   ✅ All expected columns present`);
            }

            if (extra.length > 0) {
                console.log(`   ℹ️  Extra columns found: ${extra.join(', ')}`);
                results.extraColumns[tableName] = extra;
            }

            // Quick data check
            const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
            console.log(`   📊 Row count: ${count || 0}`);

        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
            results.tablesMissing.push(tableName);
        }
        console.log('');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');

    console.log(`\n✅ Tables found: ${results.tablesFound.length}`);
    results.tablesFound.forEach(t => console.log(`   - ${t}`));

    if (results.tablesMissing.length > 0) {
        console.log(`\n❌ Tables missing: ${results.tablesMissing.length}`);
        results.tablesMissing.forEach(t => console.log(`   - ${t}`));
    }

    const totalMissing = Object.values(results.missingColumns).reduce((sum, cols) => sum + cols.length, 0);
    if (totalMissing > 0) {
        console.log(`\n⚠️  Total missing columns across all tables: ${totalMissing}`);

        console.log('\n📝 MISSING COLUMNS BY TABLE:');
        for (const [table, cols] of Object.entries(results.missingColumns)) {
            if (cols.length > 0) {
                console.log(`\n   ${table}:`);
                cols.forEach(col => {
                    const expectedType = expectedTables[table][col];
                    console.log(`      + ${col} (${expectedType})`);
                });
            }
        }
    } else {
        console.log('\n✅ All expected columns exist in all tables!');
    }

    // Generate migration SQL
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📝 MIGRATION SQL (copy to Supabase SQL Editor):');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Tables to create
    if (results.tablesMissing.length > 0) {
        console.log('-- ===========================================');
        console.log('-- CREATE MISSING TABLES');
        console.log('-- ===========================================\n');

        for (const table of results.tablesMissing) {
            console.log(`-- Table: ${table}`);
            console.log(`CREATE TABLE IF NOT EXISTS ${table} (`);
            const cols = [];
            for (const [col, type] of Object.entries(expectedTables[table])) {
                let sqlType = type;
                if (type === 'uuid') sqlType = 'UUID DEFAULT gen_random_uuid() PRIMARY KEY';
                else if (type === 'text') sqlType = 'TEXT';
                else if (type === 'integer') sqlType = 'INTEGER';
                else if (type === 'boolean') sqlType = 'BOOLEAN DEFAULT FALSE';
                else if (type === 'jsonb') sqlType = 'JSONB DEFAULT \'{}\'';
                else if (type === 'timestamptz') sqlType = 'TIMESTAMPTZ DEFAULT NOW()';
                else if (type === 'date') sqlType = 'DATE';
                else if (type === 'numeric') sqlType = 'NUMERIC';
                cols.push(`    ${col} ${sqlType}`);
            }
            console.log(cols.join(',\n'));
            console.log(`);\n`);
        }
    }

    // Columns to add
    const allMissing = Object.entries(results.missingColumns).filter(([_, cols]) => cols.length > 0);
    if (allMissing.length > 0) {
        console.log('-- ===========================================');
        console.log('-- ADD MISSING COLUMNS');
        console.log('-- ===========================================\n');

        for (const [table, cols] of allMissing) {
            console.log(`-- Table: ${table}`);
            for (const col of cols) {
                const type = expectedTables[table][col];
                let sqlType = type;
                if (type === 'uuid') sqlType = 'UUID';
                else if (type === 'text') sqlType = 'TEXT';
                else if (type === 'integer') sqlType = 'INTEGER';
                else if (type === 'boolean') sqlType = 'BOOLEAN DEFAULT FALSE';
                else if (type === 'jsonb') sqlType = 'JSONB DEFAULT \'{}\'';
                else if (type === 'timestamptz') sqlType = 'TIMESTAMPTZ';
                else if (type === 'date') sqlType = 'DATE';
                else if (type === 'numeric') sqlType = 'NUMERIC';

                console.log(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${sqlType};`);
            }
            console.log('');
        }
    }
}

verifySchema().catch(console.error);
