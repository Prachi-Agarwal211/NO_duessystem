const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const schoolsFile = path.join(__dirname, '../../backups/config_schools_2026-01-21.csv');
const coursesFile = path.join(__dirname, '../../backups/config_courses_2026-01-21.csv');
const branchesFile = path.join(__dirname, '../../backups/config_branches_2026-01-21.csv');

// Helper to append if not exists
function appendIfNotExists(filePath, checkFn, lineGenerator) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    if (!lines.some(checkFn)) {
        const newLine = lineGenerator();
        fs.appendFileSync(filePath, '\n' + newLine);
        console.log(`Added to ${path.basename(filePath)}: ${newLine.split(',')[2]}`);
        return true;
    }
    return false;
}

// 1. Find School IDs
const schoolsContent = fs.readFileSync(schoolsFile, 'utf-8');
const findSchoolId = (namePart) => {
    const lines = schoolsContent.split('\n');
    const line = lines.find(l => l.toLowerCase().includes(namePart.toLowerCase()));
    return line ? line.split(',')[0] : null;
};

const designSchoolId = findSchoolId('Design');
const alliedHealthId = findSchoolId('Health');
const mediaSchoolId = findSchoolId('Media');
const businessSchoolId = findSchoolId('Business');

console.log('School IDs:', { designSchoolId, alliedHealthId, mediaSchoolId, businessSchoolId });

// 2. Add Missing Courses
// Schema: id,school_id,name,display_order,is_active,created_at,updated_at

const newCourses = [
    { name: 'Bachelor of Visual Arts', schoolId: designSchoolId },
    { name: 'Bachelor of Physiotherapy', schoolId: alliedHealthId },
    // { name: 'Certificate Programs', schoolId: businessSchoolId }, // Already exists? mapped to Certificate Course
];

const addedCourseIds = {};

newCourses.forEach(c => {
    if (c.schoolId) {
        const id = crypto.randomUUID();
        const added = appendIfNotExists(
            coursesFile,
            line => line.includes(`"${c.name}"`) || line.includes(`,${c.name},`),
            () => `${id},${c.schoolId},"${c.name}",0,TRUE,${new Date().toISOString()},${new Date().toISOString()}`
        );
        if (added) addedCourseIds[c.name] = id;
        else {
            // Find existing ID
            const lines = fs.readFileSync(coursesFile, 'utf-8').split('\n');
            const match = lines.find(l => l.includes(c.name));
            if (match) addedCourseIds[c.name] = match.split(',')[0];
        }
    }
});

// 3. Add Missing Branches
// Schema: id,course_id,name,display_order,is_active,created_at,updated_at

// We need IDs for courses we just touched or exist
const getCourseId = (name) => {
    if (addedCourseIds[name]) return addedCourseIds[name];
    const lines = fs.readFileSync(coursesFile, 'utf-8').split('\n');
    const match = lines.find(l => l.includes(`"${name}"`) || l.includes(`,${name},`));
    return match ? match.split(',')[0] : null;
};

const btechId = getCourseId('B.Tech');
const bbaId = getCourseId('BBA');
const mcaId = getCourseId('MCA');
const mbaId = getCourseId('MBA');
const bdesId = getCourseId('B.Des');
const bscId = getCourseId('B.Sc.');
const bhmId = getCourseId('BHM');
const bcomId = getCourseId('B.Com');
const bcaId = getCourseId('BCA');

const bvaId = getCourseId('Bachelor of Visual Arts');
const bptId = getCourseId('Bachelor of Physiotherapy');

const newBranches = [
    // EXISTING PATCHES
    { name: 'Graphic Design', courseId: bvaId },
    { name: 'Physiotherapy', courseId: bptId },

    // ENGINEERING (B.Tech)
    { name: 'CSE Software Product Engg - Kalvium', courseId: btechId },
    { name: 'CSE - CSBS - TCS', courseId: btechId },
    { name: 'CSE Generative AI - L&T', courseId: btechId },

    // BBA
    { name: 'BBA (Financial Markets (IFM))-ISDC', courseId: bbaId },
    { name: 'BBA (New Age Sales and Marketing)-CollegeDekho', courseId: bbaId },
    { name: 'BBA (Fintech)-Zell Education And Deloitte', courseId: bbaId },
    { name: 'BBA (Brand Management)-CollegeDekho', courseId: bbaId },

    // MCA
    { name: 'MCA AI & DS', courseId: mcaId }, // "MCA (Artificial Intelligence and Data Science)"
    { name: 'MCA Cloud Computing - AWS', courseId: mcaId },

    // MBA
    { name: 'MBA (Fintech)-Imarticus', courseId: mbaId },
    { name: 'MBA (New Age SM GFO AHR)-CollegeDekho', courseId: mbaId },
    { name: 'MBA Data Analytics Samatrix', courseId: mbaId },
    { name: 'MBA - CollegeDekho', courseId: mbaId },

    // DESIGN
    { name: 'B.Des (Communication Design)-ISDC', courseId: bdesId },

    // SCIENCE (B.Sc.)
    { name: 'Medical Lab Technology', courseId: bscId },
    { name: 'Radiology and Imaging Techniques', courseId: bscId },

    // BHM
    { name: 'BHMCT', courseId: bhmId },

    // B.Com
    { name: 'B. Com (Finance and Analytics-IoA)-ISDC', courseId: bcomId },

    // BCA
    { name: 'BCA (Block Chain)-upGrad Campus', courseId: bcaId },
    { name: 'BCA (Full Stack)-CollegeDekho', courseId: bcaId },
    { name: 'BCA-CollegeDekho', courseId: bcaId },
    { name: 'BCA (Cloud Computing)-Microsoft', courseId: bcaId },
    { name: 'BCA (Digital Forensics and Information Security)-CollegeDekho', courseId: bcaId },
    { name: 'BCA (Robotic Process Automation)-CollegeDekho', courseId: bcaId },
    { name: 'BCA (Health Informatics)', courseId: bcaId },

    // BBA
    { name: 'BBA (Digital Business(AISI))-ISDC', courseId: bbaId },
    { name: 'BBA (Logistics and Supply Chain Management (CIPS))-ISDC', courseId: bbaId },
    { name: 'BBA (Global Business)-ISDC', courseId: bbaId },
    { name: 'BBA (Tourism and Hospitality Management)', courseId: bbaId },
    { name: 'BBA-CollegeDekho', courseId: bbaId },

    // M.Tech
    { name: 'Civil Engineering (Construction Engineering and Management)', courseId: getCourseId('M.Tech') },
    { name: 'Civil Engineering (Transportation Engineering)', courseId: getCourseId('M.Tech') },
    { name: 'Civil Engineering (Environmental Engineering)', courseId: getCourseId('M.Tech') },
    { name: 'Mechanical Engineering (Production Engineering)', courseId: getCourseId('M.Tech') },

    // MCA
    { name: 'MCA (Full Stack)-CollegeDekho', courseId: mcaId },

    // LLM
    { name: 'LLM (Business Law)', courseId: getCourseId('LLM') },

    // DESIGN - GURUKUL
    { name: 'Bachelor of Design-Gurukul School of Design', courseId: bdesId },

    // M.Sc
    { name: 'Clinical Embryology', courseId: getCourseId('M.Sc') },

    // Bachelor of Radiation Technology (New Course Needed?)
    // "Bachelor of Radiation Technology" is the Degree in raw data.
    // If we map it to "B.Sc." course, then branch is "Radiation Technology".
    // Or add "Bachelor of Radiation Technology" as a course.
    // Let's assume it maps to B.Sc. for simplicity as it's Allied Health, or check previous mappings.
    // Mapping config: "Bachelor of Radiation Technology": "B.Sc." (Line 207 in original config?)
    // Let's check data_mapping_config.js. It says: "Bachelor of Radiation Technology": "B.Sc."
    // So we just need branch "Radiation Technology" under B.Sc.
    { name: 'Radiation Technology', courseId: bscId },

    // "Liberal Studies..." -> B.A.
    { name: 'Liberal Studies with Major (International Relations & Diplomacy)', courseId: getCourseId('B.A.') },
];

newBranches.forEach(b => {
    if (b.courseId) {
        appendIfNotExists(
            branchesFile,
            line => (line.includes(`"${b.name}"`) || line.includes(`,${b.name},`)) && line.includes(b.courseId),
            () => `${crypto.randomUUID()},${b.courseId},"${b.name}",0,TRUE,${new Date().toISOString()},${new Date().toISOString()}`
        );
    }
});
