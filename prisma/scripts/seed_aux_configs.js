const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Manually load .env
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !process.env[key.trim()]) {
            process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
        }
    });
}
const prisma = new PrismaClient();

// Helper: Parse CSV
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = {};
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else current += char;
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        headers.forEach((h, idx) => row[h] = values[idx] || '');
        rows.push(row);
    }
    return rows;
}

function loadConfigCSV(prefix) {
    const backupsDir = path.join(__dirname, '../../backups');
    const files = fs.readdirSync(backupsDir);
    const file = files.find(f => f.startsWith(prefix) && f.endsWith('.csv'));
    if (!file) return [];
    return parseCSV(fs.readFileSync(path.join(backupsDir, file), 'utf-8'));
}

async function main() {
    console.log('\n🔧 SEEDING AUXILIARY CONFIGS');
    console.log('==========================');

    // 1. Validation Rules
    const rules = loadConfigCSV('config_validation_rules');
    if (rules.length > 0) {
        console.log(`\n1. Seeding ${rules.length} Validation Rules...`);
        // Clean first? Or upsert? Clean is safer for configs.
        await prisma.configValidationRule.deleteMany();
        for (const r of rules) {
            await prisma.configValidationRule.create({
                data: {
                    id: r.id,
                    type: r.type,
                    pattern: r.pattern,
                    message: r.message,
                    isActive: r.is_active === 'TRUE' || r.is_active === 'true'
                }
            });
        }
        console.log('   ✅ Done.');
    } else {
        console.log('   ⚠️ No validation rules found to seed.');
    }

    // 2. Country Codes
    const countries = loadConfigCSV('config_country_codes');
    if (countries.length > 0) {
        console.log(`\n2. Seeding ${countries.length} Country Codes...`);
        await prisma.configCountryCode.deleteMany();
        for (const c of countries) {
            await prisma.configCountryCode.create({
                data: {
                    id: c.id,
                    countryName: c.country_name,
                    countryCode: c.country_code,
                    dialCode: c.dial_code,
                    flagEmoji: c.flag_emoji,
                    isActive: c.is_active === 'TRUE' || c.is_active === 'true',
                    displayOrder: parseInt(c.display_order || '0')
                }
            });
        }
        console.log('   ✅ Done.');
    } else {
        console.log('   ⚠️ No country codes found to seed.');
    }

    // 3. Email Configs
    const emails = loadConfigCSV('config_emails');
    if (emails.length > 0) {
        console.log(`\n3. Seeding ${emails.length} Email Configs...`);
        await prisma.configEmail.deleteMany();
        for (const e of emails) {
            await prisma.configEmail.create({
                data: {
                    key: e.key,
                    value: e.value,
                    description: e.description
                }
            });
        }
        console.log('   ✅ Done.');
    } else {
        console.log('   ⚠️ No email configs found to seed.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
