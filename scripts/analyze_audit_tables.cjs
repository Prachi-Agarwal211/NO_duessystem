// Analyze all tables for audit/history data
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
function loadEnv() {
  const envFiles = ['../.env.local', '../.env'];
  envFiles.forEach(envFile => {
    const filePath = path.join(__dirname, envFile);
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
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
  });
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function analyzeAuditTables() {
  console.log('🔍 ANALYZING AUDIT & HISTORY TABLES\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Check no_dues_status table for approval/rejection history
    console.log('📋 TABLE: no_dues_status (Approval/Rejection History)');
    console.log('-'.repeat(70));
    
    const { data: statusHistory, error: statusError } = await supabase
      .from('no_dues_status')
      .select(`
        *,
        no_dues_forms!inner(
          registration_no,
          student_name,
          created_at
        )
      `)
      .or('status.eq.approved,status.eq.rejected')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (statusError) {
      console.error('❌ Error fetching status history:', statusError);
    } else {
      console.log(`✅ Found ${statusHistory.length} recent approval/rejection records:\n`);
      
      statusHistory.forEach((record, index) => {
        console.log(`${index + 1}. ${record.no_dues_forms.registration_no} - ${record.no_dues_forms.student_name}`);
        console.log(`   Department: ${record.department_name}`);
        console.log(`   Status: ${record.status.toUpperCase()}`);
        console.log(`   Action At: ${record.action_at || record.updated_at}`);
        console.log(`   Action By: ${record.action_by || 'System'}`);
        console.log(`   Remarks: ${record.remarks || 'None'}`);
        console.log(`   Rejection Reason: ${record.rejection_reason || 'N/A'}`);
        console.log('');
      });
    }

    // 2. Check for audit_logs table
    console.log('📋 TABLE: audit_logs (System Audit Trail)');
    console.log('-'.repeat(70));
    
    try {
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditError) {
        console.log('⚠️  audit_logs table not found or no access');
      } else {
        console.log(`✅ Found ${auditLogs.length} audit log entries:\n`);
        
        auditLogs.forEach((log, index) => {
          console.log(`${index + 1}. ${log.action || 'Unknown Action'}`);
          console.log(`   User: ${log.user_id || 'Unknown'}`);
          console.log(`   Timestamp: ${log.created_at}`);
          console.log(`   Details: ${JSON.stringify(log.details || {})}`);
          console.log('');
        });
      }
    } catch (e) {
      console.log('⚠️  audit_logs table does not exist');
    }

    // 3. Check all tables for any history/audit related data
    console.log('\n📋 CHECKING ALL TABLES FOR HISTORY DATA');
    console.log('-'.repeat(70));
    
    const tables = [
      'no_dues_forms',
      'no_dues_status', 
      'student_data',
      'profiles',
      'departments',
      'audit_logs',
      'approval_history',
      'rejection_history',
      'action_logs',
      'user_actions'
    ];

    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: ${count} records`);
          
          // Check if table has timestamp columns that could be used for history
          if (count > 0) {
            const { data: sample, error: sampleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
              
            if (!sampleError && sample.length > 0) {
              const columns = Object.keys(sample[0]);
              const timeColumns = columns.filter(col => 
                col.includes('created_at') || 
                col.includes('updated_at') || 
                col.includes('action_at') ||
                col.includes('timestamp')
              );
              
              if (timeColumns.length > 0) {
                console.log(`   Time columns: ${timeColumns.join(', ')}`);
              }
            }
          }
        }
      } catch (e) {
        console.log(`❌ ${tableName}: Table does not exist`);
      }
    }

    // 4. Get comprehensive approval/rejection statistics
    console.log('\n📊 APPROVAL/REJECTION STATISTICS');
    console.log('-'.repeat(70));
    
    const { data: allStatus, error: allStatusError } = await supabase
      .from('no_dues_status')
      .select('status, department_name, action_at, action_by');

    if (!allStatusError && allStatus) {
      const stats = {
        total: allStatus.length,
        approved: allStatus.filter(s => s.status === 'approved').length,
        rejected: allStatus.filter(s => s.status === 'rejected').length,
        pending: allStatus.filter(s => s.status === 'pending').length,
        in_progress: allStatus.filter(s => s.status === 'in_progress').length
      };

      console.log(`Total Status Records: ${stats.total}`);
      console.log(`Approved: ${stats.approved}`);
      console.log(`Rejected: ${stats.rejected}`);
      console.log(`Pending: ${stats.pending}`);
      console.log(`In Progress: ${stats.in_progress}`);

      // Department-wise breakdown
      const deptStats = {};
      allStatus.forEach(record => {
        if (!deptStats[record.department_name]) {
          deptStats[record.department_name] = { approved: 0, rejected: 0, pending: 0 };
        }
        deptStats[record.department_name][record.status]++;
      });

      console.log('\nDepartment-wise Statistics:');
      Object.entries(deptStats).forEach(([dept, counts]) => {
        console.log(`   ${dept}:`);
        console.log(`     Approved: ${counts.approved}`);
        console.log(`     Rejected: ${counts.rejected}`);
        console.log(`     Pending: ${counts.pending}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎯 RECOMMENDATIONS FOR HISTORY/AUDIT DASHBOARD:');
    console.log('='.repeat(70));
    console.log('1. Use no_dues_status table for approval/rejection history');
    console.log('2. Create pagination for status records');
    console.log('3. Add filters by department, status, date range');
    console.log('4. Show action_by, action_at, remarks, rejection_reason');
    console.log('5. Create audit trail if audit_logs table exists');
    console.log('6. Add export functionality for history data');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run analysis
analyzeAuditTables().catch(console.error);
