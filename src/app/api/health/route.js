export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/health
 * Comprehensive health check endpoint for monitoring system status
 */
export async function GET() {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {}
  };

  try {
    // Database connectivity check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        healthStatus.checks.database = error ? 'unhealthy' : 'healthy';
        healthStatus.checks.database_error = error?.message || null;
      } catch (dbError) {
        healthStatus.checks.database = 'unhealthy';
        healthStatus.checks.database_error = dbError.message;
      }
    } else {
      healthStatus.checks.database = 'unhealthy';
      healthStatus.checks.database_error = 'Missing Supabase configuration';
    }

    // Environment variables check
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SMTP_USER',
      'SMTP_PASS'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
    healthStatus.checks.environment = missingEnvVars.length === 0 ? 'healthy' : 'unhealthy';
    if (missingEnvVars.length > 0) {
      healthStatus.checks.missing_env_vars = missingEnvVars;
    }

    // Memory usage check
    const memUsage = process.memoryUsage();
    healthStatus.checks.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) + '%'
    };

    // Overall status determination
    const allChecksHealthy = Object.values(healthStatus.checks).every(check => check === 'healthy');
    healthStatus.status = allChecksHealthy ? 'healthy' : 'unhealthy';

    return NextResponse.json(healthStatus, { 
      status: allChecksHealthy ? 200 : 503 
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      version: process.env.npm_package_version || '1.0.0'
    }, { status: 500 });
  }
}
