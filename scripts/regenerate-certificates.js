// Regenerate certificates for all completed students
// This script will regenerate certificates with improved QR code
// Run with: node scripts/regenerate-certificates.js

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file manually
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        }
    }
}

loadEnv();

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function regenerateCertificates() {
    let output = 'CERTIFICATE REGENERATION LOG\n';
    output += '='.repeat(60) + '\n';
    output += `Started at: ${new Date().toISOString()}\n\n`;

    try {
        // Find all completed forms that have certificates
        console.log('🔍 Finding completed forms with certificates...');
        
        const { data: forms, error } = await supabaseAdmin
            .from('no_dues_forms')
            .select('id, registration_no, student_name, status, final_certificate_generated, certificate_url')
            .eq('status', 'completed')
            .eq('final_certificate_generated', true)
            .not('certificate_url', 'is', null);

        if (error) {
            throw new Error(`Error fetching forms: ${error.message}`);
        }

        output += `Found ${forms.length} completed forms with certificates\n\n`;
        console.log(`Found ${forms.length} forms to regenerate`);

        let successCount = 0;
        let failCount = 0;

        for (const form of forms) {
            output += `─`.repeat(50) + '\n';
            output += `Processing: ${form.registration_no} (${form.student_name})\n`;
            output += `Form ID: ${form.id}\n`;
            output += `Old Certificate: ${form.certificate_url}\n`;

            try {
                // Import the certificate service directly for force regeneration
                const { finalizeCertificate } = await import('../src/lib/certificateService.js');

                // Call finalizeCertificate directly - this will regenerate the certificate
                const result = await finalizeCertificate(form.id);

                if (result.success) {
                    output += `Status: SUCCESS\n`;
                    output += `New Certificate: ${result.certificateUrl}\n`;
                    successCount++;
                } else {
                    output += `Status: FAILED - ${result.error}\n`;
                    failCount++;
                }
            } catch (err) {
                output += `Status: ERROR - ${err.message}\n`;
                failCount++;
            }

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        output += `\n` + `=`.repeat(60) + '\n';
        output += `REGENERATION COMPLETE\n`;
        output += `=`.repeat(60) + '\n';
        output += `Total Forms: ${forms.length}\n`;
        output += `Success: ${successCount}\n`;
        output += `Failed: ${failCount}\n`;
        output += `Completed at: ${new Date().toISOString()}\n`;

        // Write to file
        fs.writeFileSync('regenerate-certs-output.txt', output);
        console.log(`\n✅ Regeneration complete!`);
        console.log(`Success: ${successCount}, Failed: ${failCount}`);
        console.log(`Results written to regenerate-certs-output.txt`);

    } catch (error) {
        output += `FATAL ERROR: ${error.message}\n`;
        output += error.stack + '\n';
        fs.writeFileSync('regenerate-certs-output.txt', output);
        console.error('Fatal error:', error);
    }
}

regenerateCertificates();
