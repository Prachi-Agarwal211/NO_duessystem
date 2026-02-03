// Create missing chat tables
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

async function createChatTables() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                 CREATING CHAT TABLES                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Create chat_messages table
    console.log('1️⃣  CREATING chat_messages TABLE');
    console.log('-'.repeat(70));
    
    const createChatMessagesSQL = `
      CREATE TABLE IF NOT EXISTS public.chat_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        form_id UUID NOT NULL REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
        department_name TEXT NOT NULL,
        sender_id UUID NOT NULL,
        sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'staff', 'admin')),
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_read BOOLEAN DEFAULT FALSE,
        reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL
      );
      
      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_chat_messages_form_id ON public.chat_messages(form_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_department ON public.chat_messages(department_name);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
    `;
    
    const { error: chatMessagesError } = await supabase.rpc('exec_sql', { sql: createChatMessagesSQL });
    
    if (chatMessagesError) {
      console.error('❌ Error creating chat_messages table:', chatMessagesError);
      
      // Try alternative approach using direct SQL
      try {
        const { error: directError } = await supabase
          .from('chat_messages')
          .select('id')
          .limit(1);
        
        if (directError && directError.code === 'PGRST116') {
          console.log('📝 Table does not exist, creating via SQL...');
          // This would need to be done manually in Supabase dashboard
          console.log('⚠️  Please run the following SQL in Supabase SQL Editor:');
          console.log(createChatMessagesSQL);
        }
      } catch (e) {
        console.log('⚠️  Please run the following SQL in Supabase SQL Editor:');
        console.log(createChatMessagesSQL);
      }
    } else {
      console.log('✅ chat_messages table created successfully');
    }
    
    // 2. Create chat_unread_counts table
    console.log('\n2️⃣  CREATING chat_unread_counts TABLE');
    console.log('-'.repeat(70));
    
    const createUnreadCountsSQL = `
      CREATE TABLE IF NOT EXISTS public.chat_unread_counts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        department_name TEXT NOT NULL,
        form_id UUID NOT NULL REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
        count INTEGER DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(user_id, department_name, form_id)
      );
      
      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_chat_unread_user_id ON public.chat_unread_counts(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_unread_department ON public.chat_unread_counts(department_name);
      CREATE INDEX IF NOT EXISTS idx_chat_unread_form_id ON public.chat_unread_counts(form_id);
    `;
    
    const { error: unreadCountsError } = await supabase.rpc('exec_sql', { sql: createUnreadCountsSQL });
    
    if (unreadCountsError) {
      console.error('❌ Error creating chat_unread_counts table:', unreadCountsError);
      console.log('⚠️  Please run the following SQL in Supabase SQL Editor:');
      console.log(createUnreadCountsSQL);
    } else {
      console.log('✅ chat_unread_counts table created successfully');
    }
    
    // 3. Enable RLS (Row Level Security)
    console.log('\n3️⃣  ENABLING ROW LEVEL SECURITY');
    console.log('-'.repeat(70));
    
    const enableRLSSQL = `
      -- Enable RLS on chat_messages
      ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
      
      -- Enable RLS on chat_unread_counts
      ALTER TABLE public.chat_unread_counts ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for chat_messages
      CREATE POLICY "Users can view messages for their department or own forms" ON public.chat_messages
        FOR SELECT USING (
          department_name IN (
            SELECT department_name FROM public.profiles 
            WHERE id = auth.uid()
          ) OR
          form_id IN (
            SELECT id FROM public.no_dues_forms 
            WHERE student_email = (
              SELECT email FROM auth.users WHERE id = auth.uid()
            )
          )
        );
      
      -- Create policy for chat_unread_counts
      CREATE POLICY "Users can view their own unread counts" ON public.chat_unread_counts
        FOR SELECT USING (user_id = auth.uid());
    `;
    
    console.log('⚠️  Please run the following RLS SQL in Supabase SQL Editor:');
    console.log(enableRLSSQL);
    
    // 4. Test table creation
    console.log('\n4️⃣  TESTING TABLE CREATION');
    console.log('-'.repeat(70));
    
    // Test chat_messages table
    try {
      const { data: testMessages, error: testMessagesError } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);
      
      if (testMessagesError) {
        console.log('❌ chat_messages table still not accessible:', testMessagesError.message);
      } else {
        console.log('✅ chat_messages table is accessible');
      }
    } catch (e) {
      console.log('❌ chat_messages table test failed:', e.message);
    }
    
    // Test chat_unread_counts table
    try {
      const { data: testUnread, error: testUnreadError } = await supabase
        .from('chat_unread_counts')
        .select('id')
        .limit(1);
      
      if (testUnreadError) {
        console.log('❌ chat_unread_counts table still not accessible:', testUnreadError.message);
      } else {
        console.log('✅ chat_unread_counts table is accessible');
      }
    } catch (e) {
      console.log('❌ chat_unread_counts table test failed:', e.message);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔧 CHAT TABLES SETUP COMPLETE');
    console.log('='.repeat(70));
    console.log('📝 If tables were not created automatically, please run the SQL commands');
    console.log('   shown above in your Supabase SQL Editor.');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createChatTables();
