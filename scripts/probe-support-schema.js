const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function probeSchema() {
    console.log('🧪 Probing support_tickets schema...');

    const sets = [
        {
            name: 'API Set (user_email, message)',
            data: {
                user_email: 'probe@test.com',
                user_name: 'Probe',
                message: 'This is a test message to probe the schema',
                subject: 'Probe',
                requester_type: 'student',
                ticket_number: 'PRB-' + Date.now()
            }
        },
        {
            name: 'Migration Set (student_email, description)',
            data: {
                student_email: 'probe@test.com',
                student_name: 'Probe',
                registration_no: 'TEST001',
                description: 'This is a test message to probe the schema',
                subject: 'Probe',
                category: 'general',
                ticket_number: 'PRB-' + Date.now()
            }
        }
    ];

    for (const set of sets) {
        console.log(`\nTesting ${set.name}...`);
        const { data, error } = await supabase
            .from('support_tickets')
            .insert([set.data])
            .select();

        if (error) {
            console.log(`❌ ${set.name} failed:`, error.message);
            if (error.details) console.log(`   Details: ${error.details}`);
        } else {
            console.log(`✅ ${set.name} SUCCESS!`);
            console.log('Actual columns from result:', Object.keys(data[0]));
            // Clean up
            await supabase.from('support_tickets').delete().eq('id', data[0].id);
            return; // Stop if we found a working set
        }
    }
}

probeSchema();
