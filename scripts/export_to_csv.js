const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

async function exportAllTables() {
    console.log('🚀 Starting Universal Stable Database Export...');

    const tables = [
        'student_data',
        'no_dues_forms',
        'no_dues_status',
        'profiles',
        'departments',
        'config_schools',
        'config_courses',
        'config_branches',
        'config_emails',
        'config_validation_rules',
        'config_country_codes',
        'config_reapplication_rules',
        'no_dues_reapplication_history',
        'certificate_verifications',
        'email_logs',
        'support_tickets'
    ];

    for (const tableName of tables) {
        try {
            process.stdout.write(`📥 Exporting ${tableName}... `);

            let allData = [];
            let from = 0;
            const CHUNK_SIZE = 1000;
            let hasMore = true;

            while (hasMore) {
                // Fetch data with range and ordering to ensure consistent pagination
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .range(from, from + CHUNK_SIZE - 1)
                    .order('id', { ascending: true });

                if (error) {
                    // Fallback for tables that might not have an 'id' column
                    if (error.message.includes('column "id" does not exist')) {
                        const { data: fallbackData, error: fallbackError } = await supabase
                            .from(tableName)
                            .select('*')
                            .range(from, from + CHUNK_SIZE - 1);

                        if (fallbackError) {
                            console.log(`❌ Error: ${fallbackError.message}`);
                            hasMore = false;
                            continue;
                        }

                        if (fallbackData && fallbackData.length > 0) {
                            allData = allData.concat(fallbackData);
                            if (fallbackData.length < CHUNK_SIZE) {
                                hasMore = false;
                            } else {
                                from += CHUNK_SIZE;
                            }
                        } else {
                            hasMore = false;
                        }
                    } else {
                        console.log(`❌ Error: ${error.message}`);
                        hasMore = false;
                        continue;
                    }
                } else {
                    if (data && data.length > 0) {
                        allData = allData.concat(data);
                        if (data.length < CHUNK_SIZE) {
                            hasMore = false;
                        } else {
                            from += CHUNK_SIZE;
                        }
                    } else {
                        hasMore = false;
                    }
                }
            }

            if (allData.length === 0) {
                console.log('⚠️ Empty (skipped)');
                continue;
            }

            // Convert to CSV
            const worksheet = XLSX.utils.json_to_sheet(allData);
            const csv = XLSX.utils.sheet_to_csv(worksheet);

            const filePath = path.join(BACKUP_DIR, `${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
            fs.writeFileSync(filePath, csv);

            console.log(`✅ Success (${allData.length} rows) -> ${path.basename(filePath)}`);
        } catch (err) {
            console.log(`❌ Exception: ${err.message}`);
        }
    }

    console.log('\n🎉 Backup process complete! All data saved in the /backups folder.');
}

exportAllTables().catch(console.error);
