const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Get Raw CSV Count
    const rawFile = path.join(__dirname, '../../backups/Student_data_JU_Jan2026_FULL.csv');
    const content = fs.readFileSync(rawFile, 'utf-8');
    // Filter empty lines
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    // Minus header
    const rawCount = lines.length - 1;

    console.log(`\n📊 VERIFICATION REPORT`);
    console.log(`----------------------------------------`);
    console.log(`📄 Raw CSV Records:    ${rawCount}`);

    // 2. Get DB Count
    const dbCount = await prisma.student_data.count();
    console.log(`🗄️  Database Records:   ${dbCount}`);

    // 3. Compare
    let output = `----------------------------------------\n`;
    if (rawCount === dbCount) {
        output += `✅ MATCH: 100% Data Seeded Successfully.\n`;
    } else {
        output += `❌ MISMATCH: Missing ${rawCount - dbCount} records.\n`;
        output += `Raw: ${rawCount}, DB: ${dbCount}\n`;
    }
    fs.writeFileSync(path.join(__dirname, '../../processed_data/verification_output.txt'), output);
    console.log(output);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
