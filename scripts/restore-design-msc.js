require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreDesignMscAndCheckSciences() {
    console.log('\n🔧 FIXING M.Sc COURSES\n');
    console.log('='.repeat(60));

    // Step 1: Find Jaipur School of Design
    console.log('\n1️⃣ Finding Jaipur School of Design...');
    const { data: designSchool } = await supabase
        .from('config_schools')
        .select('id, name')
        .eq('name', 'Jaipur School of Design')
        .single();

    if (!designSchool) {
        console.error('❌ School not found!');
        return;
    }
    console.log(`   ✅ Found: ${designSchool.name} (ID: ${designSchool.id})`);

    // Step 2: Check if M.Sc already exists in Jaipur School of Design
    console.log('\n2️⃣ Checking if M.Sc exists in Jaipur School of Design...');
    const { data: existingMsc } = await supabase
        .from('config_courses')
        .select('id, name')
        .eq('school_id', designSchool.id)
        .eq('name', 'M.Sc')
        .single();

    if (existingMsc) {
        console.log(`   ✅ M.Sc already exists (ID: ${existingMsc.id})`);
    } else {
        // Create M.Sc course in Jaipur School of Design
        console.log('   📝 Creating M.Sc course in Jaipur School of Design...');

        // Get max display_order
        const { data: maxOrder } = await supabase
            .from('config_courses')
            .select('display_order')
            .eq('school_id', designSchool.id)
            .order('display_order', { ascending: false })
            .limit(1)
            .single();

        const nextOrder = maxOrder ? maxOrder.display_order + 1 : 1;

        const { data: newCourse, error: createError } = await supabase
            .from('config_courses')
            .insert([{
                school_id: designSchool.id,
                name: 'M.Sc',
                display_order: nextOrder,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (createError) {
            console.error('   ❌ Error creating course:', createError);
            return;
        }
        console.log(`   ✅ Created M.Sc course (ID: ${newCourse.id})`);

        // Add branches for the M.Sc course
        console.log('\n3️⃣ Adding branches to M.Sc in Jaipur School of Design...');
        const branches = [
            'Graphic Design',
            'Interior Design',
            'Fashion Design',
            'Jewellery Design'
        ];

        const branchRecords = branches.map((name, index) => ({
            course_id: newCourse.id,
            name: name,
            display_order: index + 1,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));

        const { error: branchError } = await supabase
            .from('config_branches')
            .insert(branchRecords);

        if (branchError) {
            console.error('   ❌ Error creating branches:', branchError);
            return;
        }
        console.log(`   ✅ Added ${branches.length} branches`);
    }

    // Step 3: Check for duplicate M.Sc in School of Sciences
    console.log('\n4️⃣ Checking for duplicate M.Sc in School of Sciences...');

    const { data: sciencesSchool } = await supabase
        .from('config_schools')
        .select('id, name')
        .eq('name', 'School of Sciences')
        .single();

    const { data: sciencesMscCourses } = await supabase
        .from('config_courses')
        .select('id, name')
        .eq('school_id', sciencesSchool.id)
        .ilike('name', '%M.Sc%');

    console.log(`   Found ${sciencesMscCourses.length} M.Sc course(s) in School of Sciences:`);
    for (const c of sciencesMscCourses) {
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);
        console.log(`     - ${c.name} (ID: ${c.id}) - ${count} branches`);
    }

    if (sciencesMscCourses.length > 1) {
        console.log('\n   ⚠️  DUPLICATE FOUND! Please specify which one to keep.');
    } else {
        console.log('\n   ✅ No duplicates in School of Sciences');
    }

    // Final verification
    console.log('\n' + '='.repeat(60));
    console.log('FINAL STATE - All M.Sc Courses:\n');

    const { data: allMsc } = await supabase
        .from('config_courses')
        .select(`
      id, 
      name, 
      config_schools (name)
    `)
        .ilike('name', '%M.Sc%');

    for (const c of allMsc) {
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);
        console.log(`  ${c.config_schools?.name} -> ${c.name} (${count} branches)`);
    }

    console.log('\n✅ Done!\n');
}

restoreDesignMscAndCheckSciences()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
