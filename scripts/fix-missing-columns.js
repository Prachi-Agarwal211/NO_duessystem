require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addMissingColumns() {
    console.log('\n🔧 ADDING MISSING COLUMNS TO no_dues_forms\n');
    console.log('='.repeat(60));

    // Check and add rejection_reason column
    console.log('\n1️⃣ Adding rejection_reason column...');

    const { error: err1 } = await supabase.rpc('exec_sql', {
        sql: `
      ALTER TABLE no_dues_forms 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `
    });

    if (err1) {
        // Try direct SQL via REST
        console.log('   Trying alternative method...');

        // We'll need to check if column exists first
        const { data: columns } = await supabase
            .from('no_dues_forms')
            .select('*')
            .limit(1);

        if (columns && columns[0] && !('rejection_reason' in columns[0])) {
            console.log('   ⚠️ Column missing - need to add via SQL');
            console.log('   Run this SQL in Supabase dashboard:');
            console.log('   ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS rejection_reason TEXT;');
        } else if (columns && columns[0] && 'rejection_reason' in columns[0]) {
            console.log('   ✅ Column already exists!');
        }
    } else {
        console.log('   ✅ Column added successfully');
    }

    console.log('\n✅ Done!\n');
}

addMissingColumns()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
