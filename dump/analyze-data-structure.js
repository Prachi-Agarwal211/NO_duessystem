/**
 * Analyze Schools, Courses, and Branches Data Structure
 * 
 * This script:
 * 1. Fetches all schools, courses, and branches from the database
 * 2. Builds a complete tree view
 * 3. Identifies missing, duplicate, or inconsistent data
 * 4. Provides a summary report
 * 
 * Usage: node scripts/analyze-data-structure.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Create Supabase admin client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function validateEnvironment() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing required environment variables. Check .env.local file.');
    }
}

async function fetchAllData() {
    console.log('\n🔍 Fetching all data from database...\n');

    // Fetch all schools
    const { data: schools, error: schoolError } = await supabase
        .from('config_schools')
        .select('*')
        .order('display_order', { ascending: true });

    if (schoolError) throw schoolError;

    // Fetch all courses
    const { data: courses, error: courseError } = await supabase
        .from('config_courses')
        .select('*')
        .order('display_order', { ascending: true });

    if (courseError) throw courseError;

    // Fetch all branches
    const { data: branches, error: branchError } = await supabase
        .from('config_branches')
        .select('*')
        .order('display_order', { ascending: true });

    if (branchError) throw branchError;

    return { schools, courses, branches };
}

function buildTreeStructure(schools, courses, branches) {
    const tree = [];

    for (const school of schools) {
        const schoolNode = {
            id: school.id,
            name: school.name,
            displayOrder: school.display_order,
            isActive: school.is_active,
            courses: []
        };

        const schoolCourses = courses.filter(c => c.school_id === school.id);

        for (const course of schoolCourses) {
            const courseNode = {
                id: course.id,
                name: course.name,
                displayOrder: course.display_order,
                isActive: course.is_active,
                branches: []
            };

            const courseBranches = branches.filter(b => b.course_id === course.id);

            for (const branch of courseBranches) {
                courseNode.branches.push({
                    id: branch.id,
                    name: branch.name,
                    displayOrder: branch.display_order,
                    isActive: branch.is_active
                });
            }

            // Sort branches by display_order
            courseNode.branches.sort((a, b) => a.displayOrder - b.displayOrder);
            schoolNode.courses.push(courseNode);
        }

        // Sort courses by display_order
        schoolNode.courses.sort((a, b) => a.displayOrder - b.displayOrder);
        tree.push(schoolNode);
    }

    return tree;
}

function analyzeData(tree, courses, branches) {
    const issues = {
        duplicateBranches: [],
        orphanedCourses: [],
        orphanedBranches: [],
        displayOrderGaps: [],
        inactiveCourses: [],
        inactiveBranches: [],
        emptySchools: [],
        emptyCourses: []
    };

    // Find orphaned courses (courses without valid school)
    const schoolIds = new Set(tree.map(s => s.id));
    const orphanedCourses = courses.filter(c => !schoolIds.has(c.school_id));
    issues.orphanedCourses = orphanedCourses.map(c => ({ name: c.name, id: c.id, school_id: c.school_id }));

    // Find orphaned branches (branches without valid course)
    const courseIds = new Set(courses.map(c => c.id));
    const orphanedBranches = branches.filter(b => !courseIds.has(b.course_id));
    issues.orphanedBranches = orphanedBranches.map(b => ({ name: b.name, id: b.id, course_id: b.course_id }));

    // Find duplicates within each course
    for (const school of tree) {
        if (school.courses.length === 0) {
            issues.emptySchools.push({ name: school.name, id: school.id });
        }

        for (const course of school.courses) {
            if (course.branches.length === 0) {
                issues.emptyCourses.push({
                    school: school.name,
                    course: course.name,
                    courseId: course.id
                });
            }

            // Check for duplicate branch names
            const branchNames = course.branches.map(b => b.name.toLowerCase().trim());
            const seen = new Set();
            for (let i = 0; i < branchNames.length; i++) {
                if (seen.has(branchNames[i])) {
                    issues.duplicateBranches.push({
                        school: school.name,
                        course: course.name,
                        branch: course.branches[i].name,
                        branchId: course.branches[i].id
                    });
                }
                seen.add(branchNames[i]);
            }

            // Check for display order gaps
            const orders = course.branches.map(b => b.displayOrder).sort((a, b) => a - b);
            for (let i = 0; i < orders.length - 1; i++) {
                if (orders[i + 1] - orders[i] > 1) {
                    issues.displayOrderGaps.push({
                        school: school.name,
                        course: course.name,
                        gap: `Missing order ${orders[i] + 1} to ${orders[i + 1] - 1}`
                    });
                }
            }

            // Check for inactive items
            if (!course.isActive) {
                issues.inactiveCourses.push({ school: school.name, course: course.name });
            }

            for (const branch of course.branches) {
                if (!branch.isActive) {
                    issues.inactiveBranches.push({
                        school: school.name,
                        course: course.name,
                        branch: branch.name
                    });
                }
            }
        }
    }

    return issues;
}

function generateTreeReport(tree) {
    let report = '';
    report += '╔═══════════════════════════════════════════════════════════════════════════════╗\n';
    report += '║                    COMPLETE DATA TREE STRUCTURE                               ║\n';
    report += '╚═══════════════════════════════════════════════════════════════════════════════╝\n\n';

    for (const school of tree) {
        const activeStatus = school.isActive ? '✅' : '❌';
        report += `${activeStatus} 🏫 ${school.name}\n`;
        report += `   ID: ${school.id}\n`;
        report += `   Courses: ${school.courses.length}\n`;
        report += '   ─'.repeat(30) + '\n';

        for (const course of school.courses) {
            const courseActive = course.isActive ? '✅' : '❌';
            report += `   ${courseActive} 📚 ${course.name}\n`;
            report += `      ID: ${course.id}\n`;
            report += `      Branches: ${course.branches.length}\n`;

            for (const branch of course.branches) {
                const branchActive = branch.isActive ? '✅' : '❌';
                report += `      ${branchActive} 🔹 ${branch.displayOrder}. ${branch.name}\n`;
            }
            report += '\n';
        }
        report += '\n';
    }

    return report;
}

function generateSummary(tree, issues) {
    let totalCourses = 0;
    let totalBranches = 0;

    for (const school of tree) {
        totalCourses += school.courses.length;
        for (const course of school.courses) {
            totalBranches += course.branches.length;
        }
    }

    let summary = '\n';
    summary += '╔═══════════════════════════════════════════════════════════════════════════════╗\n';
    summary += '║                              SUMMARY REPORT                                   ║\n';
    summary += '╚═══════════════════════════════════════════════════════════════════════════════╝\n\n';

    summary += '📊 STATISTICS:\n';
    summary += `   Total Schools: ${tree.length}\n`;
    summary += `   Total Courses: ${totalCourses}\n`;
    summary += `   Total Branches: ${totalBranches}\n\n`;

    summary += '📈 BREAKDOWN BY SCHOOL:\n';
    for (const school of tree) {
        let branchCount = 0;
        for (const course of school.courses) {
            branchCount += course.branches.length;
        }
        summary += `   ${school.name}:\n`;
        summary += `      Courses: ${school.courses.length}, Branches: ${branchCount}\n`;
    }
    summary += '\n';

    // Issues
    const hasIssues = Object.values(issues).some(arr => arr.length > 0);

    if (hasIssues) {
        summary += '⚠️  ISSUES FOUND:\n\n';

        if (issues.duplicateBranches.length > 0) {
            summary += `   🔴 DUPLICATE BRANCHES (${issues.duplicateBranches.length}):\n`;
            issues.duplicateBranches.forEach(d => {
                summary += `      - ${d.school} → ${d.course} → "${d.branch}"\n`;
            });
            summary += '\n';
        }

        if (issues.orphanedCourses.length > 0) {
            summary += `   🔴 ORPHANED COURSES (${issues.orphanedCourses.length}):\n`;
            issues.orphanedCourses.forEach(c => {
                summary += `      - "${c.name}" (missing school: ${c.school_id})\n`;
            });
            summary += '\n';
        }

        if (issues.orphanedBranches.length > 0) {
            summary += `   🔴 ORPHANED BRANCHES (${issues.orphanedBranches.length}):\n`;
            issues.orphanedBranches.forEach(b => {
                summary += `      - "${b.name}" (missing course: ${b.course_id})\n`;
            });
            summary += '\n';
        }

        if (issues.emptySchools.length > 0) {
            summary += `   🟡 EMPTY SCHOOLS (${issues.emptySchools.length}):\n`;
            issues.emptySchools.forEach(s => {
                summary += `      - "${s.name}"\n`;
            });
            summary += '\n';
        }

        if (issues.emptyCourses.length > 0) {
            summary += `   🟡 EMPTY COURSES (no branches) (${issues.emptyCourses.length}):\n`;
            issues.emptyCourses.forEach(c => {
                summary += `      - ${c.school} → "${c.course}"\n`;
            });
            summary += '\n';
        }

        if (issues.displayOrderGaps.length > 0) {
            summary += `   🟡 DISPLAY ORDER GAPS (${issues.displayOrderGaps.length}):\n`;
            issues.displayOrderGaps.forEach(g => {
                summary += `      - ${g.school} → ${g.course}: ${g.gap}\n`;
            });
            summary += '\n';
        }

        if (issues.inactiveCourses.length > 0) {
            summary += `   ℹ️  INACTIVE COURSES (${issues.inactiveCourses.length}):\n`;
            issues.inactiveCourses.forEach(c => {
                summary += `      - ${c.school} → ${c.course}\n`;
            });
            summary += '\n';
        }

        if (issues.inactiveBranches.length > 0) {
            summary += `   ℹ️  INACTIVE BRANCHES (${issues.inactiveBranches.length}):\n`;
            issues.inactiveBranches.forEach(b => {
                summary += `      - ${b.school} → ${b.course} → ${b.branch}\n`;
            });
            summary += '\n';
        }
    } else {
        summary += '✅ NO ISSUES FOUND! Data structure is clean.\n\n';
    }

    return summary;
}

function generateJSONExport(tree) {
    return JSON.stringify(tree, null, 2);
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║              Analyze Schools, Courses, and Branches Structure                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

    try {
        await validateEnvironment();
        console.log('✅ Environment validated\n');

        const { schools, courses, branches } = await fetchAllData();
        console.log(`📊 Found: ${schools.length} schools, ${courses.length} courses, ${branches.length} branches\n`);

        const tree = buildTreeStructure(schools, courses, branches);
        const issues = analyzeData(tree, courses, branches);

        // Generate reports
        const treeReport = generateTreeReport(tree);
        const summary = generateSummary(tree, issues);
        const jsonExport = generateJSONExport(tree);

        // Print to console
        console.log(treeReport);
        console.log(summary);

        // Save reports to files
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        fs.writeFileSync(
            path.join(outputDir, `data-structure-tree_${timestamp}.txt`),
            treeReport + summary
        );

        fs.writeFileSync(
            path.join(outputDir, `data-structure-tree_${timestamp}.json`),
            jsonExport
        );

        console.log(`\n📁 Reports saved to:\n`);
        console.log(`   - ${path.join(outputDir, `data-structure-tree_${timestamp}.txt`)}`);
        console.log(`   - ${path.join(outputDir, `data-structure-tree_${timestamp}.json`)}`);

        console.log('\n✅ Analysis complete!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
