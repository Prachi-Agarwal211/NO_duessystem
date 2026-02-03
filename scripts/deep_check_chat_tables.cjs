// Deep check of all chat-related tables and functionality
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepCheckChatTables() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              DEEP CHAT TABLES ANALYSIS                             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check all tables in the database
    console.log('1️⃣  CHECKING ALL TABLES IN DATABASE');
    console.log('-'.repeat(70));
    
    // Get all tables using information_schema
    const { data: allTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (tablesError) {
      console.error('❌ Error getting tables:', tablesError);
      
      // Alternative approach - try common chat table names
      console.log('🔄 Trying alternative approach - checking common chat table names...');
      const possibleChatTables = [
        'chat_messages',
        'chat_unread_counts', 
        'chats',
        'messages',
        'chat',
        'conversations',
        'chat_history',
        'message_threads',
        'department_chats',
        'student_chats'
      ];
      
      for (const tableName of possibleChatTables) {
        try {
          const { data: testTable, error: testError } = await supabase
            .from(tableName)
            .select('id')
            .limit(1);
          
          if (!testError) {
            console.log(`✅ Found table: ${tableName}`);
            
            // Get table structure
            const { data: tableData, error: structError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!structError && tableData && tableData.length > 0) {
              console.log(`   Columns: ${Object.keys(tableData[0]).join(', ')}`);
            }
          } else if (testError.code !== 'PGRST116') {
            console.log(`⚠️  Table ${tableName} exists but error: ${testError.message}`);
          }
        } catch (e) {
          // Table doesn't exist, continue
        }
      }
    } else {
      console.log(`📊 Found ${allTables?.length || 0} tables in public schema`);
      
      // Filter for chat-related tables
      const chatTables = allTables?.filter(table => 
        table.table_name.toLowerCase().includes('chat') ||
        table.table_name.toLowerCase().includes('message') ||
        table.table_name.toLowerCase().includes('conversation')
      ) || [];
      
      if (chatTables.length > 0) {
        console.log('\n📝 Chat-related tables found:');
        chatTables.forEach(table => {
          console.log(`   - ${table.table_name} (${table.table_schema})`);
        });
        
        // Get structure of each chat table
        for (const table of chatTables) {
          console.log(`\n🔍 Structure of ${table.table_name}:`);
          try {
            const { data: sampleData, error: sampleError } = await supabase
              .from(table.table_name)
              .select('*')
              .limit(1);
            
            if (!sampleError && sampleData && sampleData.length > 0) {
              console.log(`   Columns: ${Object.keys(sampleData[0]).join(', ')}`);
              
              // Get record count
              const { count, error: countError } = await supabase
                .from(table.table_name)
                .select('*', { count: 'exact', head: true });
              
              if (!countError) {
                console.log(`   Records: ${count || 0}`);
              }
            } else {
              console.log(`   Error getting structure: ${sampleError?.message}`);
            }
          } catch (e) {
            console.log(`   Could not access table: ${e.message}`);
          }
        }
      } else {
        console.log('❌ No chat-related tables found');
      }
    }
    
    // 2. Check chat API endpoints to understand expected structure
    console.log('\n2️⃣  ANALYZING CHAT API ENDPOINTS');
    console.log('-'.repeat(70));
    
    // Read chat API files to understand expected table structure
    const chatApiFiles = [
      '../src/app/api/chat/[formId]/[department]/route.js',
      '../src/app/api/chat/unread/route.js',
      '../src/app/api/chat/mark-read/route.js',
      '../src/app/api/staff/active-chats/route.js'
    ];
    
    for (const filePath of chatApiFiles) {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        console.log(`\n📁 Reading: ${filePath}`);
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Extract table references
        const tableMatches = content.match(/from\s*['"`]([^'"`]+)['"`]/g);
        if (tableMatches) {
          const tables = [...new Set(tableMatches.map(m => m.match(/from\s*['"`]([^'"`]+)['"`]/)[1]))];
          console.log(`   Tables referenced: ${tables.join(', ')}`);
        }
        
        // Extract insert operations
        const insertMatches = content.match(/insert\s*\([^)]*\)\s*\.values?\s*\([^)]*\)/gi);
        if (insertMatches) {
          console.log(`   Insert operations found: ${insertMatches.length}`);
        }
      }
    }
    
    // 3. Check for any existing chat data in alternative locations
    console.log('\n3️⃣  CHECKING FOR CHAT DATA IN ALTERNATIVE LOCATIONS');
    console.log('-'.repeat(70));
    
    // Check if chat data might be stored in no_dues_status or other tables
    const possibleChatColumns = [
      'remarks',
      'message',
      'chat_message',
      'notes',
      'comments'
    ];
    
    for (const column of possibleChatColumns) {
      try {
        const { data: columnData, error: columnError } = await supabase
          .from('no_dues_status')
          .select(`id, ${column}`)
          .not(column, 'is', null)
          .limit(3);
        
        if (!columnError && columnData && columnData.length > 0) {
          console.log(`✅ Found data in no_dues_status.${column}:`);
          columnData.forEach((row, i) => {
            const value = row[column] ? String(row[column]).substring(0, 50) + '...' : 'NULL';
            console.log(`   ${i+1}. ${value}`);
          });
        }
      } catch (e) {
        // Column doesn't exist
      }
    }
    
    // 4. Check database schema files
    console.log('\n4️⃣  CHECKING DATABASE SCHEMA FILES');
    console.log('-'.repeat(70));
    
    const schemaFiles = [
      '../schema.sql',
      '../database.sql',
      '../supabase.sql',
      '../migrations'
    ];
    
    for (const schemaPath of schemaFiles) {
      const fullPath = path.join(__dirname, schemaPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Found schema file: ${schemaPath}`);
        
        if (fs.statSync(fullPath).isDirectory()) {
          const files = fs.readdirSync(fullPath);
          console.log(`   Contains ${files.length} files: ${files.slice(0, 5).join(', ')}`);
        }
      } else if (fs.existsSync(fullPath + '.sql')) {
        console.log(`✅ Found schema file: ${schemaPath}.sql`);
      }
    }
    
    // 5. Check if chat was implemented differently
    console.log('\n5️⃣  INVESTIGATING ALTERNATIVE CHAT IMPLEMENTATIONS');
    console.log('-'.repeat(70));
    
    // Check for any JSON columns that might store chat data
    try {
      const { data: jsonColumns, error: jsonError } = await supabase
        .from('no_dues_forms')
        .select('id, metadata, extra_data, chat_data, messages')
        .limit(1);
      
      if (!jsonError && jsonColumns && jsonColumns.length > 0) {
        const jsonKeys = Object.keys(jsonColumns[0]).filter(key => {
          const value = jsonColumns[0][key];
          return value && typeof value === 'object';
        });
        
        if (jsonKeys.length > 0) {
          console.log(`✅ Found JSON columns that might store chat: ${jsonKeys.join(', ')}`);
        }
      }
    } catch (e) {
      // No JSON columns
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DEEP CHAT TABLES ANALYSIS COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deepCheckChatTables();
