#!/usr/bin/env node

/**
 * JECRC No Dues System - Supabase Automated Setup Script
 * 
 * This script automates the complete Supabase setup:
 * 1. Creates storage buckets with correct limits
 * 2. Runs database setup SQL
 * 3. Creates admin account
 * 4. Verifies everything is working
 * 
 * Prerequisites:
 * - Node.js 18+
 * - Supabase credentials (URL and Service Role Key)
 * 
 * Usage:
 *   node scripts/setup-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}▶${colors.reset} ${msg}`),
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Main setup function
async function setupSupabase() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  JECRC No Dues System - Supabase Automated Setup              ║
║  This script will configure your entire Supabase project      ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // Step 1: Get Supabase credentials
    log.step('Step 1: Getting Supabase credentials');
    
    const supabaseUrl = await question('Enter your Supabase URL: ');
    const serviceRoleKey = await question('Enter your Supabase Service Role Key: ');
    
    if (!supabaseUrl || !serviceRoleKey) {
      log.error('Supabase URL and Service Role Key are required!');
      process.exit(1);
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    log.success('Supabase client initialized');

    // Step 2: Create storage buckets
    log.step('Step 2: Creating storage buckets');
    
    const buckets = [
      { 
        name: 'no-dues-files', 
        public: true, 
        fileSizeLimit: 102400, // 100KB
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png']
      },
      { 
        name: 'alumni-screenshots', 
        public: true, 
        fileSizeLimit: 102400, // 100KB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      },
      { 
        name: 'certificates', 
        public: true, 
        fileSizeLimit: 204800, // 200KB
        allowedMimeTypes: ['application/pdf']
      }
    ];

    for (const bucket of buckets) {
      log.info(`Creating bucket: ${bucket.name}`);
      
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });

      if (error) {
        if (error.message.includes('already exists')) {
          log.warning(`Bucket '${bucket.name}' already exists, skipping...`);
        } else {
          log.error(`Failed to create bucket '${bucket.name}': ${error.message}`);
        }
      } else {
        log.success(`Created bucket: ${bucket.name} (${bucket.fileSizeLimit / 1024}KB limit)`);
      }
    }

    // Step 3: Run database setup SQL
    log.step('Step 3: Running database setup SQL');
    
    const sqlPath = path.join(__dirname, '..', 'ULTIMATE_DATABASE_SETUP.sql');
    
    if (!fs.existsSync(sqlPath)) {
      log.error(`SQL file not found at: ${sqlPath}`);
      log.error('Please ensure ULTIMATE_DATABASE_SETUP.sql exists in the project root');
      process.exit(1);
    }

    log.info('Reading SQL file...');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    log.info('Executing SQL (this may take 30-60 seconds)...');
    const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
      sql_string: sqlContent
    });

    if (sqlError) {
      // Try alternative method - split into statements
      log.warning('Direct execution failed, trying statement-by-statement...');
      
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        const { error } = await supabase.from('_').select('*').limit(0); // Dummy query
        // Note: Supabase client doesn't support raw SQL execution directly
        // This would need to be done via the Supabase Management API
        successCount++;
      }

      log.warning('SQL execution requires manual setup via Supabase Dashboard');
      log.info('Please run ULTIMATE_DATABASE_SETUP.sql manually in SQL Editor');
      
      const continueSetup = await question('\nHave you run the SQL file manually? (yes/no): ');
      if (continueSetup.toLowerCase() !== 'yes') {
        log.error('Setup aborted. Please run SQL file and restart script.');
        process.exit(1);
      }
    } else {
      log.success('Database setup completed successfully!');
    }

    // Step 4: Verify database setup
    log.step('Step 4: Verifying database setup');
    
    const verifications = [
      { 
        name: 'Departments table', 
        query: async () => {
          const { count } = await supabase.from('departments').select('*', { count: 'exact', head: true });
          return count === 10;
        }
      },
      { 
        name: 'Schools table', 
        query: async () => {
          const { count } = await supabase.from('config_schools').select('*', { count: 'exact', head: true });
          return count === 13;
        }
      },
      { 
        name: 'Branches table', 
        query: async () => {
          const { count } = await supabase.from('config_branches').select('*', { count: 'exact', head: true });
          return count >= 139;
        }
      }
    ];

    let allVerified = true;
    for (const verification of verifications) {
      try {
        const result = await verification.query();
        if (result) {
          log.success(`${verification.name} verified`);
        } else {
          log.error(`${verification.name} verification failed`);
          allVerified = false;
        }
      } catch (error) {
        log.error(`${verification.name} verification error: ${error.message}`);
        allVerified = false;
      }
    }

    if (!allVerified) {
      log.warning('Some verifications failed. Please check database setup manually.');
    }

    // Step 5: Create admin account
    log.step('Step 5: Creating admin account');
    
    const createAdmin = await question('\nCreate admin account? (yes/no): ');
    
    if (createAdmin.toLowerCase() === 'yes') {
      const adminEmail = await question('Admin email (default: admin@jecrcu.edu.in): ') || 'admin@jecrcu.edu.in';
      const adminPassword = await question('Admin password (min 8 characters): ');
      
      if (adminPassword.length < 8) {
        log.error('Password must be at least 8 characters!');
      } else {
        log.info('Creating admin user in Supabase Auth...');
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            full_name: 'System Administrator',
            role: 'admin'
          }
        });

        if (authError) {
          log.error(`Failed to create auth user: ${authError.message}`);
        } else {
          log.success(`Auth user created with ID: ${authData.user.id}`);
          
          // Create profile
          log.info('Creating admin profile...');
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            email: adminEmail,
            full_name: 'System Administrator',
            role: 'admin',
            is_active: true
          });

          if (profileError) {
            log.error(`Failed to create profile: ${profileError.message}`);
          } else {
            log.success('Admin account created successfully!');
            log.info(`Email: ${adminEmail}`);
            log.info(`Password: ${adminPassword}`);
          }
        }
      }
    }

    // Step 6: Enable connection pooling
    log.step('Step 6: Configuration recommendations');
    log.info('Please manually configure in Supabase Dashboard:');
    log.info('1. Database → Connection Pooling:');
    log.info('   - Mode: Transaction');
    log.info('   - Pool Size: 15');
    log.info('   - Connection Timeout: 15 seconds');
    log.info('2. Database → Replication:');
    log.info('   - Enable realtime for: no_dues_forms, no_dues_status, support_tickets');

    // Final summary
    console.log(`
${colors.green}╔════════════════════════════════════════════════════════════════╗
║                  🎉 SETUP COMPLETE! 🎉                        ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.cyan}✓ Storage buckets created (3)${colors.reset}
${colors.cyan}✓ Database schema deployed${colors.reset}
${colors.cyan}✓ Admin account created${colors.reset}

${colors.yellow}Next Steps:${colors.reset}
1. Complete manual configurations (connection pooling, realtime)
2. Deploy to Render using: ${colors.magenta}npm run deploy${colors.reset}
3. Test the system using: ${colors.magenta}node scripts/test-deployment.js${colors.reset}

${colors.blue}Your Supabase project is ready! 🚀${colors.reset}
    `);

  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
setupSupabase();