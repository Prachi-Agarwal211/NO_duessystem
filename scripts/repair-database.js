/**
 * DATABASE REPAIR SCRIPT
 * This script scans all forms in the database and ensures they have the required department status entries.
 * Run with: node scripts/repair-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env files');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairDatabase() {
    console.log('🚀 Starting Database Repair...');

    try {
        // 1. Fetch all forms
        const { data: forms, error: formsError } = await supabase
            .from('no_dues_forms')
            .select('id, student_name, registration_no, school_id, course_id, branch_id');

        if (formsError) throw formsError;
        console.log(`📋 Found ${forms.length} forms to check.`);

        // 2. Fetch all active departments
        const { data: departments, error: deptsError } = await supabase
            .from('departments')
            .select('*')
            .eq('is_active', true);

        if (deptsError) throw deptsError;
        console.log(`📋 Found ${departments.length} active departments.`);

        let totalFixed = 0;
        let totalChecked = 0;

        for (const form of forms) {
            totalChecked++;
            if (totalChecked % 10 === 0) console.log(`⏳ Checked ${totalChecked}/${forms.length} forms...`);

            // Find relevant departments for this form's scope
            const relevantDepts = departments.filter(dept => {
                const hasNoScope = (!dept.allowed_school_ids || dept.allowed_school_ids.length === 0) &&
                    (!dept.allowed_course_ids || dept.allowed_course_ids.length === 0) &&
                    (!dept.allowed_branch_ids || dept.allowed_branch_ids.length === 0);

                if (hasNoScope) return true;

                const schoolMatch = !dept.allowed_school_ids || dept.allowed_school_ids.length === 0 ||
                    dept.allowed_school_ids.includes(form.school_id);
                const courseMatch = !dept.allowed_course_ids || dept.allowed_course_ids.length === 0 ||
                    dept.allowed_course_ids.includes(form.course_id);
                const branchMatch = !dept.allowed_branch_ids || dept.allowed_branch_ids.length === 0 ||
                    dept.allowed_branch_ids.includes(form.branch_id);

                return schoolMatch && courseMatch && branchMatch;
            });

            // Check existing statuses for this form
            const { data: existingStatuses, error: statusError } = await supabase
                .from('no_dues_status')
                .select('department_name')
                .eq('form_id', form.id);

            if (statusError) {
                console.error(`❌ Error checking statuses for form ${form.id}:`, statusError);
                continue;
            }

            const existingNames = new Set(existingStatuses.map(s => s.department_name));
            const missingDepts = relevantDepts.filter(dept => !existingNames.has(dept.name));

            if (missingDepts.length > 0) {
                console.log(`🔧 Form ${form.registration_no} (${form.student_name}) is missing ${missingDepts.length} statuses. Repairing...`);

                const inserts = missingDepts.map(dept => ({
                    form_id: form.id,
                    department_name: dept.name,
                    status: 'pending'
                }));

                const { error: insertError } = await supabase
                    .from('no_dues_status')
                    .insert(inserts);

                if (insertError) {
                    console.error(`❌ Failed to repair form ${form.registration_no}:`, insertError.message);
                } else {
                    totalFixed += missingDepts.length;
                    console.log(`✅ Repaired ${missingDepts.length} departments for ${form.registration_no}`);
                }
            }
        }

        console.log(`\n✨ Repair Complete!`);
        console.log(`📊 Total Forms Checked: ${totalChecked}`);
        console.log(`📊 Total Status Records Fixed: ${totalFixed}`);

    } catch (err) {
        console.error('💥 Database repair failed with fatal error:', err);
    }
}

repairDatabase();
