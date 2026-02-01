const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function probeColumns() {
    console.log('🧪 Probing support_tickets columns...');

    const possibleColumns = [
        'id', 'form_id', 'user_email', 'student_email', 'user_name', 'student_name',
        'registration_no', 'user_id', 'message', 'description', 'subject', 'category',
        'status', 'priority', 'ticket_number', 'requester_type', 'user_type',
        'created_at', 'updated_at', 'resolved_at', 'ticket_id'
    ];

    const results = {};

    for (const col of possibleColumns) {
        const { error } = await supabase
            .from('support_tickets')
            .select(col)
            .limit(1);

        if (error) {
            results[col] = '❌ ' + error.message;
        } else {
            results[col] = '✅';
        }
    }

    console.log('\nColumn Probing Results:');
    console.table(results);

    const fs = require('fs');
    fs.writeFileSync('scripts/thorough-probe-results.json', JSON.stringify(results, null, 2));
    console.log('✅ Results saved to scripts/thorough-probe-results.json');

    // Iteratively find required columns
    console.log('\n🔍 Identifying all required columns...');
    let currentPayload = {};
    const requiredColumns = [];
    let maxAttempts = 15;

    while (maxAttempts > 0) {
        const { error: insertError } = await supabase
            .from('support_tickets')
            .insert([currentPayload]);

        if (insertError) {
            if (insertError.message.includes('not-null constraint')) {
                // Extract column name from error: null value in column "id" violates not-null constraint
                const match = insertError.message.match(/column "([^"]+)"/);
                if (match && match[1]) {
                    const col = match[1];
                    console.log(`Found required column: ${col}`);
                    requiredColumns.push(col);
                    // Add some dummy data based on common types
                    if (col === 'id' || col === 'form_id') {
                        currentPayload[col] = '550e8400-e29b-41d4-a716-446655440000';
                    } else if (col.includes('at')) {
                        currentPayload[col] = new Date().toISOString();
                    } else {
                        currentPayload[col] = 'TEST';
                    }
                } else {
                    console.log('Could not extract column name from error:', insertError.message);
                    break;
                }
            } else {
                console.log('Unexpected error or submission successful?!:', insertError.message);
                break;
            }
        } else {
            console.log('✅ Found all required columns! Insertion would succeed.');
            break;
        }
        maxAttempts--;
    }

    console.log('\nFinal list of required columns:', requiredColumns);
    fs.appendFileSync('scripts/thorough-probe-results.json', '\n\nRequired Columns:\n' + JSON.stringify(requiredColumns, null, 2));
}

probeColumns();
