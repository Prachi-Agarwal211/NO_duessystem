/**
 * Quick Database Health Check
 * Run: node scripts/check-database-status.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  console.log('\n🔍 JECRC No Dues System - Database Health Check\n');
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const { data, error } = await supabase.from('config_schools').select('count').limit(1);
    
    if (error) {
      console.log('❌ Database connection: FAILED');
      console.log('Error:', error.message);
      return;
    }
    
    console.log('✅ Database connection: SUCCESS\n');
    
    // Check data counts
    console.log('📊 Data Summary:');
    
    const checks = [
      { table: 'config_schools', expected: 13, name: 'Schools' },
      { table: 'config_courses', expected: 28, name: 'Courses' },
      { table: 'config_branches', expected: 139, name: 'Branches' },
      { table: 'departments', expected: 11, name: 'Departments' },
      { table: 'config_validation_rules', expected: 10, name: 'Validation Rules' },
      { table: 'config_emails', expected: 1, name: 'Email Configs' },
      { table: 'profiles', expected: null, name: 'User Accounts' }
    ];
    
    for (const check of checks) {
      const { count, error } = await supabase
        .from(check.table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${check.name}: ERROR - ${error.message}`);
      } else {
        const status = check.expected && count < check.expected ? '⚠️' : '✅';
        console.log(`${status} ${check.name}: ${count} ${check.expected ? `(expected ${check.expected})` : ''}`);
      }
    }
    
    // Check college email domain
    console.log('\n📧 Email Configuration:');
    const { data: emails } = await supabase
      .from('config_emails')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (emails) {
      console.log(`✅ College domain: ${emails.college_domain}`);
      console.log(`✅ Department emails configured: ${emails.department_emails ? 'Yes' : 'No'}`);
    }
    
    // Check validation rules format
    console.log('\n🔍 Validation Rules Check:');
    const { data: rules } = await supabase
      .from('config_validation_rules')
      .select('*')
      .in('rule_name', ['session_year', 'student_name']);
    
    const sessionRule = rules?.find(r => r.rule_name === 'session_year');
    const nameRule = rules?.find(r => r.rule_name === 'student_name');
    
    if (sessionRule) {
      const hasIssue = sessionRule.rule_pattern.includes('\\\\');
      console.log(`${hasIssue ? '❌' : '✅'} Session Year Pattern: ${sessionRule.rule_pattern}`);
      if (hasIssue) {
        console.log('   ⚠️  WARNING: Double backslash detected! Should be: ^\\d{4}$');
      }
    }
    
    if (nameRule) {
      const hasIssue = nameRule.rule_pattern.includes('\\\\');
      console.log(`${hasIssue ? '❌' : '✅'} Student Name Pattern: ${nameRule.rule_pattern}`);
      if (hasIssue) {
        console.log('   ⚠️  WARNING: Double backslash detected!');
      }
    }
    
    // Check for forms
    console.log('\n📝 Forms Summary:');
    const { count: totalForms } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total forms: ${totalForms}`);
    
    if (totalForms > 0) {
      const statuses = ['pending', 'completed', 'rejected'];
      for (const status of statuses) {
        const { count } = await supabase
          .from('no_dues_forms')
          .select('*', { count: 'exact', head: true })
          .eq('status', status);
        console.log(`  - ${status}: ${count}`);
      }
    }
    
    console.log('\n✅ Database health check complete!\n');
    
  } catch (err) {
    console.log('\n❌ Health check failed:', err.message);
    console.error(err);
  }
}

checkDatabase();