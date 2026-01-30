// Check certificate URL for 22BCOM1367
// Run: node scripts/check-certificate.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCertificate() {
    try {
        console.log('🔍 Checking certificate for 22BCOM1367...\n');

        const { data, error } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, student_name, status, final_certificate_generated, certificate_url, blockchain_tx, blockchain_hash')
            .eq('registration_no', '22BCOM1367')
            .single();

        if (error) throw error;

        console.log('Form Details:');
        console.log('  ID:', data.id);
        console.log('  Registration:', data.registration_no);
        console.log('  Student Name:', data.student_name);
        console.log('  Status:', data.status);
        console.log('\nCertificate Status:');
        console.log('  final_certificate_generated:', data.final_certificate_generated);
        console.log('  certificate_url:', data.certificate_url || '❌ NOT SET');
        console.log('  blockchain_tx:', data.blockchain_tx || '❌ NOT SET');
        console.log('  blockchain_hash:', data.blockchain_hash ? '✅ SET' : '❌ NOT SET');

        if (data.certificate_url) {
            console.log('\n✅ CERTIFICATE IS READY!');
            console.log('URL:', data.certificate_url);
        } else {
            console.log('\n❌ Certificate URL not found');
            console.log('This means certificate generation failed or was not triggered');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkCertificate();
