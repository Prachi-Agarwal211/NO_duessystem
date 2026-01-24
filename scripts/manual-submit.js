/**
 * Manual Submission Script for 21BCON532
 */

require('dotenv').config();

async function simulateSubmission() {
    const regNo = '21BCON532';
    console.log(`🚀 Simulating Submission for ${regNo}...\n`);

    // 1. Exact data payload (Matches student_data lookup)
    const payload = {
        registration_no: "21BCON532",
        student_name: "SUSHIL KUMAR AGARWAL",
        parent_name: "SUSHIL KUMAR AGARWAL",
        personal_email: "prachiagarwal211@gmail.com",
        college_email: "21bcan532@jecrcu.edu.in",
        contact_no: "9876543210",
        country_code: "+91",
        admission_year: "2021",
        passing_year: "2025",
        school: "907c8024-1d37-4cdb-8836-1246c411a769",
        school_name: "School of Engineering & Technology",
        course: "898e411b-10ed-485a-8024-1d370946e567",
        course_name: "B.Tech",
        branch: "3c3606f7-49f9-40ced0-41d3-4bd1-b105-6a38d2",
        branch_name: "Computer Science & Engineering",
        alumni_profile_link: "https://jualumni.in/p/sushil-agarwal"
    };

    try {
        const response = await fetch('http://localhost:3000/api/student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('--- RESPONSE ---');
        console.log(JSON.stringify(result, null, 2));
        console.log('--- END ---');

        if (result.success) {
            console.log('\n✅ Form submitted successfully!');
        } else {
            console.log('\n❌ Submission Failed:', result.error);
        }

    } catch (err) {
        console.error('Network Error:', err.message);
    }
}

simulateSubmission();
