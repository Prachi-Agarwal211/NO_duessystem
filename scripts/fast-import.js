/**
 * FAST Direct PostgreSQL Import Script (Optimized)
 * 
 * Uses multi-value INSERT statements to minimize round trips.
 * Inserts 29k records in ~2-5 seconds.
 * 
 * Usage: node scripts/fast-import.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CSV_PATH = path.join(__dirname, '..', 'processed_data', 'cleaned_student_data.csv');

// Parse DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

async function fastImport() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting SUPER FAST PostgreSQL import...\n');

        // 1. Read and parse CSV
        console.log('📂 Reading CSV file...');
        const content = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);
        console.log(`   Found ${lines.length - 1} records\n`);

        // 2. Fetch school/course/branch names for mapping
        console.log('🔄 Loading config data...');
        const schoolsResult = await client.query('SELECT id, name FROM config_schools');
        const coursesResult = await client.query('SELECT id, name FROM config_courses');
        const branchesResult = await client.query('SELECT id, name FROM config_branches');

        const schoolMap = new Map(schoolsResult.rows.map(r => [r.id, r.name]));
        const courseMap = new Map(coursesResult.rows.map(r => [r.id, r.name]));
        const branchMap = new Map(branchesResult.rows.map(r => [r.id, r.name]));
        console.log(`   Loaded ${schoolMap.size} schools, ${courseMap.size} courses, ${branchMap.size} branches\n`);

        // 3. Prepare bulk insert
        console.log('📤 Inserting data (using multi-value insert)...');

        let successCount = 0;
        let errorCount = 0;

        // Use Batch Insert (LIMIT: Postgres params max 65535. 14 cols + 2 = 16 params per row. 65535/16 ~= 4000 rows max batch)
        // Safe Batch Size = 1000
        const BATCH_SIZE = 1000;
        const startTime = Date.now();

        // Base SQL parts
        const sqlPrefix = `
      INSERT INTO student_data (
        registration_no, student_name, school_id, school, course_id, course, 
        branch_id, branch, personal_email, contact_no, parent_name, 
        admission_year, passing_year, country_code, updated_at, updated_by
      ) VALUES 
    `;
        const sqlSuffix = `
      ON CONFLICT (registration_no) DO UPDATE SET
        student_name = EXCLUDED.student_name,
        school_id = EXCLUDED.school_id,
        school = EXCLUDED.school,
        course_id = EXCLUDED.course_id,
        course = EXCLUDED.course,
        branch_id = EXCLUDED.branch_id,
        branch = EXCLUDED.branch,
        personal_email = EXCLUDED.personal_email,
        contact_no = EXCLUDED.contact_no,
        parent_name = EXCLUDED.parent_name,
        admission_year = EXCLUDED.admission_year,
        passing_year = EXCLUDED.passing_year,
        updated_at = NOW(),
        updated_by = 'csv_import'
    `;

        for (let i = 1; i < lines.length; i += BATCH_SIZE) {
            const batchLines = lines.slice(i, i + BATCH_SIZE);
            const params = [];
            const valueSets = [];
            let paramCount = 1;

            for (const line of batchLines) {
                const values = parseCSVLine(line);
                if (values.length !== headers.length) continue;

                const row = {};
                headers.forEach((h, idx) => row[h] = values[idx] || null);

                // Resolve names
                const schoolName = row.school_id ? (schoolMap.get(row.school_id) || '') : '';
                const courseName = row.course_id ? (courseMap.get(row.course_id) || '') : '';
                const branchName = row.branch_id ? (branchMap.get(row.branch_id) || '') : '';

                // Add params
                params.push(
                    row.registration_no?.toUpperCase() || '',
                    row.student_name || '',
                    row.school_id || null,
                    schoolName,
                    row.course_id || null,
                    courseName,
                    row.branch_id || null,
                    branchName,
                    row.email || null,
                    row.contact_no || null,
                    row.parent_name || null,
                    row.admission_year || null,
                    row.passing_year || null,
                    '+91'
                );

                // Create value placeholders ($1, $2, ...)
                const placeholders = [];
                for (let p = 0; p < 14; p++) { // 14 columns from params
                    placeholders.push(`$${paramCount++}`);
                }
                // Add hardcoded values for updated_at, updated_by
                placeholders.push('NOW()');
                placeholders.push(`'csv_import'`);

                valueSets.push(`(${placeholders.join(', ')})`);
            }

            if (valueSets.length === 0) continue;

            try {
                const query = sqlPrefix + valueSets.join(', ') + sqlSuffix;
                await client.query(query, params);

                successCount += valueSets.length;

                const progress = Math.min(i + BATCH_SIZE - 1, lines.length - 1);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`   Processed ${progress}/${lines.length - 1} records (${elapsed}s)...`);

            } catch (err) {
                console.error(`   ❌ Batch starting at row ${i} failed:`, err.message);
                errorCount += batchLines.length;
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n═'.repeat(50));
        console.log('📊 IMPORT COMPLETE');
        console.log('═'.repeat(50));
        console.log(`   Total records:     ${lines.length - 1}`);
        console.log(`   Successfully imported: ${successCount}`);
        console.log(`   Errors:            ${errorCount}`);
        console.log(`   Time:              ${totalTime} seconds`);
        console.log(`   Speed:             ${Math.round(successCount / parseFloat(totalTime))} records/sec`);
        console.log('═'.repeat(50));

        if (successCount > 0) {
            console.log('\n✅ Import completed!');
        } else {
            console.log('\n❌ Import failed utterly');
        }

    } catch (err) {
        console.error('\n❌ Fatal error:', err.message);
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

fastImport();
