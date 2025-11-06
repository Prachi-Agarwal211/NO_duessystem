const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorageBuckets() {
  try {
    console.log('\n🗄️  Setting up Storage Buckets...\n');

    // First verify connection
    console.log('🔌 Verifying Supabase connection...');
    console.log(`   URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET'}`);
    console.log(`   Service Key: ${supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'NOT SET'}\n`);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials!');
      console.error('Please check your .env.local file');
      process.exit(1);
    }

    // List of buckets to create
    const buckets = [
      {
        id: 'alumni-screenshots',
        name: 'alumni-screenshots',
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      },
      {
        id: 'certificates',
        name: 'certificates',
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf']
      }
    ];

    // Try to list buckets to verify connection
    console.log('📋 Checking existing buckets...');
    let existingBuckets = [];
    try {
      const { data, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error(`   ⚠️  Could not list buckets: ${listError.message}`);
        console.log(`   ℹ️  This might be a permissions issue or network problem`);
        console.log(`   ℹ️  You may need to create buckets manually in Supabase Dashboard\n`);
        
        // Continue anyway - we'll try to create them
      } else {
        existingBuckets = data || [];
        console.log(`   ✅ Found ${existingBuckets.length} existing bucket(s)\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error connecting to Supabase Storage: ${error.message}`);
      console.log(`   ℹ️  Check your credentials in .env.local`);
      console.log(`   ℹ️  Verify your Supabase project is active\n`);
    }

    for (const bucket of buckets) {
      console.log(`📦 Processing bucket: ${bucket.name}`);
      
      const bucketExists = existingBuckets?.some(b => b.id === bucket.id || b.name === bucket.name);
      
      if (bucketExists) {
        console.log(`   ℹ️  Bucket "${bucket.name}" already exists`);
        
        // Try to update bucket settings
        try {
          const { error: updateError } = await supabase.storage.updateBucket(bucket.id, {
            public: bucket.public,
            fileSizeLimit: bucket.fileSizeLimit,
            allowedMimeTypes: bucket.allowedMimeTypes
          });
          
          if (updateError) {
            console.log(`   ⚠️  Could not update bucket: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated bucket: ${bucket.name}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Update failed: ${error.message}`);
        }
      } else {
        try {
          const { data, error } = await supabase.storage.createBucket(bucket.id, {
            public: bucket.public,
            fileSizeLimit: bucket.fileSizeLimit,
            allowedMimeTypes: bucket.allowedMimeTypes
          });
          
          if (error) {
            console.error(`   ❌ Error creating bucket: ${error.message}`);
            console.log(`   📝 Action: Create manually in Supabase Dashboard > Storage`);
          } else {
            console.log(`   ✅ Created bucket: ${bucket.name}`);
          }
        } catch (error) {
          console.error(`   ❌ Failed to create bucket: ${error.message}`);
          console.log(`   📝 Action: Create manually in Supabase Dashboard > Storage`);
        }
      }
      console.log(''); // Empty line between buckets
      
      const bucketExists = existingBuckets?.some(b => b.id === bucket.id || b.name === bucket.name);
      
      if (bucketExists) {
        console.log(`  ℹ️  Bucket "${bucket.name}" already exists`);
        
        // Try to update bucket settings
        const { error: updateError } = await supabase.storage.updateBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes
        });
        
        if (updateError) {
          console.log(`  ⚠️  Could not update bucket "${bucket.name}": ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated bucket: ${bucket.name}`);
        }
      } else {
        const { data, error } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes
        });
        
        if (error) {
          console.error(`  ❌ Error creating bucket "${bucket.name}": ${error.message}`);
          console.log(`     Create manually in Supabase Dashboard > Storage`);
        } else {
          console.log(`  ✅ Created bucket: ${bucket.name}`);
        }
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Storage buckets setup completed!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Verify buckets in Supabase Dashboard > Storage');
    console.log('   2. If buckets were not created, create them manually:');
    console.log('      - alumni-screenshots (public, 5MB, images)');
    console.log('      - certificates (public, 10MB, PDFs)');
    console.log('   3. Run database schema in Supabase SQL Editor\n');
    
  } catch (error) {
    console.error('\n❌ Error setting up storage:', error.message);
    console.error('\n📝 Troubleshooting:');
    console.error('   1. Check .env.local file exists');
    console.error('   2. Verify NEXT_PUBLIC_SUPABASE_URL is correct');
    console.error('   3. Verify SUPABASE_SERVICE_ROLE_KEY is correct');
    console.error('   4. Check your Supabase project is active');
    console.error('   5. Create buckets manually in Supabase Dashboard if needed\n');
    process.exit(1);
  }
}

setupStorageBuckets();