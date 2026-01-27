// Trigger certificate generation for all completed forms without certificates
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateMissingCertificates() {
    console.log('='.repeat(70));
    console.log('GENERATING MISSING CERTIFICATES');
    console.log('='.repeat(70));

    // Find all completed forms without certificates
    const { data: forms, error } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, student_name, course, branch, admission_year, passing_year')
        .eq('status', 'completed')
        .eq('final_certificate_generated', false);

    if (error) {
        console.log('❌ Error:', error.message);
        return;
    }

    if (!forms || forms.length === 0) {
        console.log('✅ No forms need certificate generation');
        return;
    }

    console.log(`\nFound ${forms.length} forms needing certificates:\n`);

    for (const form of forms) {
        console.log(`📄 ${form.registration_no} (${form.student_name})`);

        try {
            // Import and call certificate service
            const { finalizeCertificate } = await import('../src/lib/certificateService.js');

            console.log('   🔄 Generating certificate...');
            const result = await finalizeCertificate(form.id);

            if (result && result.success) {
                console.log(`   ✅ Certificate generated: ${result.certificateUrl}`);
            } else {
                console.log(`   ❌ Generation failed:`, result?.error || 'Unknown error');
            }
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
            console.log(`   Stack: ${err.stack?.substring(0, 200)}`);
        }

        console.log('');
    }

    console.log('='.repeat(70));
    console.log('DONE');
    console.log('='.repeat(70));
}

generateMissingCertificates().catch(console.error);
