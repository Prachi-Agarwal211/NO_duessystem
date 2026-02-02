// Check database schema and sample data
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    console.log('🔍 CHECKING DATABASE SCHEMA...\n');

    // Get column info using information_schema
    const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'no_dues_forms')
        .eq('table_schema', 'public');

    if (error) {
        console.error('Error getting columns:', error);
    } else {
        console.log('Columns in no_dues_forms:');
        columns.forEach(col => {
            console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
    }

    console.log('\n\n📋 SAMPLE DATA (first form):');
    console.log('='.repeat(50));

    const { data: forms, error: formError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .limit(1);

    if (formError) {
        console.error('Error getting forms:', formError);
    } else if (forms && forms.length > 0) {
        console.log('\nAll keys in the form:');
        Object.keys(forms[0]).forEach(key => {
            const value = forms[0][key];
            const displayValue = value === null ? 'NULL' : (typeof value === 'object' ? JSON.stringify(value) : value);
            console.log(`  ${key}: ${displayValue}`);
        });
    }

    console.log('\n\n✅ CHECK COMPLETE');
}

checkSchema().catch(console.error);
