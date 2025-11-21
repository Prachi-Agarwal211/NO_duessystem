const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Validating Supabase Configuration...\n');

if (!supabaseUrl) console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
else console.log(`✅ URL found: ${supabaseUrl}`);

if (!supabaseServiceKey) console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing');
else console.log('✅ Service Role Key found');

if (!supabaseAnonKey) console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
else console.log('✅ Anon Key found');

if (supabaseUrl && supabaseServiceKey) {
    (async () => {
        try {
            // Extract project ID from URL
            const urlProjectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
            console.log(`\nProject ID from URL: ${urlProjectId || 'Could not extract'}`);

            // Basic JWT check (Service Role Key is a JWT)
            const parts = supabaseServiceKey.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log('Service Key Payload:', {
                    role: payload.role,
                    iss: payload.iss,
                    exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No exp'
                });

                // Check if 'iss' (issuer) contains the project reference if available
                // Usually iss is 'supabase' or similar, but sometimes contains project info depending on version
            } else {
                console.error('❌ Service Role Key is not a valid JWT format (should have 3 parts)');
            }

            console.log('\nAttempting connection...');
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            const { data, error } = await supabase.from('profiles').select('count').limit(1);

            if (error) {
                console.error('❌ Connection failed:', error.message);
                if (error.message.includes('JWT')) {
                    console.error('   -> This confirms the key is invalid for this project.');
                }
            } else {
                console.log('✅ Connection successful! Credentials are valid.');
            }

        } catch (e) {
            console.error('❌ Validation error:', e.message);
        }
    })();
}
