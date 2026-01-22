const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const REPORT_PATH = path.join(process.cwd(), 'backups', 'comparison_report.json');

async function applyFixes() {
    console.log('🛠️ Applying surgical data fixes...');

    if (!fs.existsSync(REPORT_PATH)) {
        console.error('❌ Comparison report not found!');
        process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(REPORT_PATH));
    const { missingInBackup, mismatches } = report;

    // 1. Fix Missing Records
    if (missingInBackup.length > 0) {
        console.log(`📝 Inserting ${missingInBackup.length} missing records...`);
        // We'll need the row data from the source of truth
        const XLSX = require('xlsx');
        const sourceWorkbook = XLSX.readFile(path.join(process.cwd(), 'backups', 'student_source_of_truth.csv'));
        const sourceData = XLSX.utils.sheet_to_json(sourceWorkbook.Sheets[sourceWorkbook.SheetNames[0]]);

        for (const regNo of missingInBackup) {
            const row = sourceData.find(r => r.registration_no && r.registration_no.toString().trim().toUpperCase() === regNo);
            if (row) {
                console.log(`  ➕ Inserting ${regNo}...`);
                const { error } = await supabase.rpc('map_excel_to_student_data', {
                    excel_registration_no: row.registration_no,
                    excel_student_name: row.student_name,
                    excel_school: row.school,
                    excel_course: row.course,
                    excel_branch: row.branch,
                    excel_admission_year: row.admission_year,
                    excel_personal_email: row.personal_email,
                    excel_contact_no: row.contact_no
                });
                if (error) console.error(`    ❌ Insert error for ${regNo}:`, error.message);
                else console.log(`    ✅ Inserted ${regNo}.`);
            }
        }
    }

    // 2. Fix Mismatches
    if (mismatches.length > 0) {
        console.log(`🔧 Updating ${mismatches.length} field mismatches...`);
        for (const m of mismatches) {
            console.log(`  ✏️ Updating ${m.regNo} (${m.field}): "${m.backup}" -> "${m.source}"`);
            const updateData = {};
            updateData[m.field] = m.source;
            const { error } = await supabase
                .from('student_data')
                .update(updateData)
                .eq('registration_no', m.regNo);

            if (error) console.error(`    ❌ Update error for ${m.regNo}:`, error.message);
            else console.log(`    ✅ Updated ${m.regNo}.`);
        }
    }

    console.log('\n✨ All surgical fixes applied!');
}

applyFixes().catch(console.error);
