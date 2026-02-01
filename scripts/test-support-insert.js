const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSupportTicketInsertion() {
    console.log('🔍 Testing support ticket insertion...');

    const ticketData = {
        id: crypto.randomUUID(),
        ticket_id: 'TKT-' + Date.now().toString().slice(-4),
        ticket_number: 'TKT-' + Date.now().toString().slice(-4),
        user_email: 'hostel@jecrc.edu.in',
        student_email: 'hostel@jecrc.edu.in',
        student_name: 'Hostel Dept',
        registration_no: 'DEPT_HOSTEL',
        requester_type: 'department',
        subject: 'Test Subject Department',
        message: 'Test message for department support',
        status: 'open',
        priority: 'normal',
        updated_at: new Date().toISOString()
    };

    console.log('Inserting data:', JSON.stringify(ticketData, null, 2));

    const { data, error } = await supabase
        .from('support_tickets')
        .insert([ticketData])
        .select()
        .single();

    if (error) {
        console.error('❌ Insertion Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Error Details:', error.details);
        console.error('Error Hint:', error.hint);

        if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.log('\n💡 Identified missing column issue!');
        }
    } else {
        console.log('✅ Insertion Successful!');
        console.log('Created Ticket ID:', data.id);

        // Clean up
        console.log('Cleaning up test ticket...');
        await supabase.from('support_tickets').delete().eq('id', data.id);
    }
}

testSupportTicketInsertion();
