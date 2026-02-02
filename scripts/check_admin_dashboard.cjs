// Check admin dashboard data and components
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminDashboard() {
  try {
    console.log('🔍 CHECKING ADMIN DASHBOARD DATA...\n');
    
    // 1. Check total students in database
    console.log('📊 CHECKING TOTAL STUDENTS...');
    
    const { count: totalStudents, error: totalError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      console.error('❌ Error getting total students:', totalError.message);
    } else {
      console.log(`✅ Total students in database: ${totalStudents}`);
    }
    
    // 2. Check completed students
    console.log('\n✅ CHECKING COMPLETED STUDENTS...');
    
    const { count: completedStudents, error: completedError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    if (completedError) {
      console.error('❌ Error getting completed students:', completedError.message);
    } else {
      console.log(`✅ Completed students: ${completedStudents}`);
    }
    
    // 3. Check students with certificates
    console.log('\n📜 CHECKING STUDENTS WITH CERTIFICATES...');
    
    const { count: certificateStudents, error: certificateError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('final_certificate_generated', true);
    
    if (certificateError) {
      console.error('❌ Error getting certificate students:', certificateError.message);
    } else {
      console.log(`✅ Students with certificates: ${certificateStudents}`);
    }
    
    // 4. Check status breakdown
    console.log('\n📈 CHECKING STATUS BREAKDOWN...');
    
    const { data: statusData, error: statusError } = await supabase
      .from('no_dues_forms')
      .select('status')
      .then(({ data }) => {
        const statusCounts = {};
        data.forEach(item => {
          statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
        });
        return statusCounts;
      });
    
    if (statusError) {
      console.error('❌ Error getting status breakdown:', statusError.message);
    } else {
      console.log('Status breakdown:');
      Object.entries(statusData).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} students`);
      });
    }
    
    // 5. Check recent students
    console.log('\n🕐 CHECKING RECENT STUDENTS...');
    
    const { data: recentStudents, error: recentError } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, status, final_certificate_generated, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('❌ Error getting recent students:', recentError.message);
    } else {
      console.log('Recent students:');
      recentStudents.forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.registration_no}: ${student.student_name} (${student.status}) - Certificate: ${student.final_certificate_generated ? 'Yes' : 'No'}`);
      });
    }
    
    // 6. Check admin dashboard files
    console.log('\n📁 CHECKING ADMIN DASHBOARD FILES...');
    
    const adminFiles = [
      '../src/app/admin/page.js',
      '../src/app/admin/dashboard/page.js',
      '../src/components/admin/',
      '../src/hooks/useAdminDashboard.js',
      '../src/lib/adminService.js'
    ];
    
    adminFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          console.log(`✅ Found directory: ${filePath}`);
          // List files in directory
          const files = fs.readdirSync(fullPath);
          files.forEach(file => {
            console.log(`   📄 ${file}`);
          });
        } else {
          console.log(`✅ Found file: ${filePath}`);
        }
      } else {
        console.log(`❌ Missing: ${filePath}`);
      }
    });
    
    // 7. Check if there are any API routes
    console.log('\n🛣️ CHECKING API ROUTES...');
    
    const apiRoutes = [
      '../src/app/api/admin/',
      '../src/app/api/dashboard/',
      '../src/app/api/students/'
    ];
    
    apiRoutes.forEach(routePath => {
      const fullPath = path.join(__dirname, routePath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Found API route: ${routePath}`);
        const files = fs.readdirSync(fullPath);
        files.forEach(file => {
          console.log(`   📄 ${file}`);
        });
      } else {
        console.log(`❌ Missing API route: ${routePath}`);
      }
    });
    
    // 8. Test a sample admin query
    console.log('\n🧪 TESTING SAMPLE ADMIN QUERY...');
    
    try {
      const { data: sampleData, error: sampleError } = await supabase
        .from('no_dues_forms')
        .select(`
          id,
          registration_no,
          student_name,
          status,
          final_certificate_generated,
          certificate_url,
          created_at,
          school: config_schools(name),
          course: config_courses(name),
          branch: config_branches(name)
        `)
        .eq('status', 'completed')
        .limit(3);
      
      if (sampleError) {
        console.error('❌ Sample query failed:', sampleError.message);
      } else {
        console.log('✅ Sample query successful:');
        sampleData.forEach((student, index) => {
          console.log(`  ${index + 1}. ${student.registration_no}: ${student.student_name}`);
          console.log(`     Status: ${student.status}`);
          console.log(`     School: ${student.school}`);
          console.log(`     Course: ${student.course}`);
          console.log(`     Branch: ${student.branch}`);
          console.log(`     Certificate: ${student.final_certificate_generated ? 'Yes' : 'No'}`);
        });
      }
    } catch (e) {
      console.error('❌ Sample query exception:', e.message);
    }
    
    console.log('\n🎯 ADMIN DASHBOARD CHECK COMPLETE!');
    console.log('\n💡 If data exists but dashboard shows empty:');
    console.log('1. Check if admin dashboard is using correct Supabase client');
    console.log('2. Check if there are RLS policies blocking admin access');
    console.log('3. Check browser console for JavaScript errors');
    console.log('4. Check if dashboard components are rendering correctly');
    console.log('5. Check network requests in browser dev tools');
    
  } catch (error) {
    console.error('💥 Admin dashboard check error:', error);
  }
}

checkAdminDashboard();
