// End-to-End Certificate Generation Test
// Run in Next.js environment: node --experimental-modules scripts/test-cert-e2e.mjs
// Or via: npm run test:cert

import('dotenv').then(({ config }) => config());

async function testCertificateGeneration() {
    console.log('='.repeat(70));
    console.log('END-TO-END CERTIFICATE GENERATION TEST');
    console.log('='.repeat(70));

    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Step 1: Find completed forms without certificates
    console.log('\n📋 Step 1: Finding completed forms without certificates...');

    const { data: forms, error } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, student_name, status, final_certificate_generated, certificate_url')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`Found ${forms?.length || 0} completed forms`);

    for (const form of forms || []) {
        console.log(`\n  ${form.registration_no} - ${form.student_name}`);
        console.log(`    Status: ${form.status}`);
        console.log(`    Certificate: ${form.final_certificate_generated ? '✅ Generated' : '❌ Not generated'}`);
        if (form.certificate_url) {
            console.log(`    URL: ${form.certificate_url}`);
        }
    }

    // Step 2: Try generating certificates for those without
    const needsCert = forms?.filter(f => !f.final_certificate_generated) || [];

    if (needsCert.length === 0) {
        console.log('\n✅ All completed forms have certificates!');
        return;
    }

    console.log(`\n📋 Step 2: ${needsCert.length} forms need certificates`);

    for (const form of needsCert) {
        console.log(`\n🔄 Generating certificate for ${form.registration_no}...`);

        try {
            // Import certificate trigger
            const { triggerCertificateGeneration } = await import('../src/lib/certificateTrigger.js');

            const result = await triggerCertificateGeneration(form.id, 'test-script');

            if (result.success) {
                console.log(`   ✅ SUCCESS: ${result.certificateUrl}`);
            } else {
                console.log(`   ❌ FAILED: ${result.error}`);
            }
        } catch (err) {
            console.log(`   ❌ ERROR: ${err.message}`);
        }
    }

    // Step 3: Verify
    console.log('\n📋 Step 3: Verifying results...');

    const { data: updated } = await supabase
        .from('no_dues_forms')
        .select('registration_no, final_certificate_generated, certificate_url')
        .eq('status', 'completed');

    const withCert = updated?.filter(f => f.final_certificate_generated).length || 0;
    const total = updated?.length || 0;

    console.log(`\n✅ ${withCert}/${total} completed forms now have certificates`);

    console.log('\n' + '='.repeat(70));
    console.log('TEST COMPLETE');
    console.log('='.repeat(70));
}

testCertificateGeneration().catch(console.error);
