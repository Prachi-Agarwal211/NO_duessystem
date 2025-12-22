// Comprehensive environment variable validation service
// This ensures all required configurations are present at startup

/**
 * Environment variable validation configuration
 */
const REQUIRED_ENV_VARS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'SMTP_USER',
    'SMTP_PASS'
];

const OPTIONAL_ENV_VARS = [
    'NEXT_PUBLIC_BASE_URL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_FROM'
    // REMOVED: Department emails - Not used (staff accounts handle emails via database)
];

const DEVELOPMENT_OPTIONAL = [
    'NEXT_PUBLIC_DEV_MODE',
    'NEXT_PUBLIC_ENABLE_LOGGING'
];

/**
 * Validates required environment variables
 * @returns {Object} - Validation result with status and missing variables
 */
export const validateRequiredEnvVars = () => {
    const missing = [];
    const present = [];

    for (const envVar of REQUIRED_ENV_VARS) {
        if (process.env[envVar]) {
            present.push(envVar);
        } else {
            missing.push(envVar);
        }
    }

    return {
        isValid: missing.length === 0,
        missing,
        present,
        totalRequired: REQUIRED_ENV_VARS.length,
        totalPresent: present.length
    };
};

/**
 * Validates optional environment variables
 * @returns {Object} - Validation result with status and missing optional variables
 */
export const validateOptionalEnvVars = () => {
    const present = [];
    const missing = [];

    for (const envVar of OPTIONAL_ENV_VARS) {
        if (process.env[envVar]) {
            present.push(envVar);
        } else {
            missing.push(envVar);
        }
    }

    return {
        hasOptional: present.length > 0,
        present,
        missing,
        totalOptional: OPTIONAL_ENV_VARS.length,
        totalPresent: present.length
    };
};

/**
 * Validates department email configurations (REMOVED - NOT USED)
 * Staff accounts system handles emails via database, not env vars
 */
export const validateDepartmentEmails = () => {
    return {
        allConfigured: true,
        configured: [],
        missing: [],
        totalDepartments: 0,
        totalConfigured: 0
    };
};

/**
 * Validates JWT secret strength
 * @returns {Object} - Validation result for JWT secret
 */
export const validateJWTSecret = () => {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        return {
            isValid: false,
            error: 'JWT_SECRET is not configured'
        };
    }

    if (jwtSecret.length < 32) {
        return {
            isValid: false,
            error: 'JWT_SECRET must be at least 32 characters long for security'
        };
    }

    if (process.env.NODE_ENV === 'development' && jwtSecret === 'your-jwt-secret-key-change-in-production') {
        return {
            isValid: false,
            error: 'JWT_SECRET appears to be a default value. Please set a secure secret.'
        };
    }

    return {
        isValid: true,
        length: jwtSecret.length,
        strength: jwtSecret.length >= 64 ? 'strong' : 'medium'
    };
};

/**
 * Validates Supabase configuration
 * @returns {Object} - Validation result for Supabase config
 */
export const validateSupabaseConfig = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const issues = [];

    if (!url || !url.startsWith('https://')) {
        issues.push('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
    }

    if (!anonKey || anonKey.length < 40) {
        issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid anon key');
    }

    if (!serviceKey || serviceKey.length < 40) {
        issues.push('SUPABASE_SERVICE_ROLE_KEY must be a valid service role key');
    }

    // Note: Supabase service role keys are JWTs that don't contain the hostname
    // Skipping hostname validation as it causes false positives
    // The key validity will be checked during actual API calls

    return {
        isValid: issues.length === 0,
        issues,
        urlConfigured: !!url,
        anonKeyConfigured: !!anonKey,
        serviceKeyConfigured: !!serviceKey
    };
};

/**
 * Validates email service configuration (SMTP/Nodemailer)
 * @returns {Object} - Validation result for email config
 */
export const validateEmailConfig = () => {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = process.env.SMTP_PORT || '587';
    const smtpFrom = process.env.SMTP_FROM;

    const issues = [];

    if (!smtpUser || !smtpUser.includes('@')) {
        issues.push('SMTP_USER must be a valid email address');
    }

    if (!smtpPass || smtpPass.length < 8) {
        issues.push('SMTP_PASS must be configured (minimum 8 characters)');
    }

    if (smtpFrom && !smtpFrom.includes('@')) {
        issues.push('SMTP_FROM must be a valid email address');
    }

    // Check for default/placeholder values
    if (smtpUser && smtpUser.includes('your-email')) {
        issues.push('SMTP_USER appears to be a placeholder value');
    }

    if (smtpPass && (smtpPass === 'your-password' || smtpPass === 'your-app-password')) {
        issues.push('SMTP_PASS appears to be a placeholder value');
    }

    return {
        isValid: issues.length === 0,
        issues,
        smtpUserConfigured: !!smtpUser,
        smtpPassConfigured: !!smtpPass,
        smtpHost: smtpHost,
        smtpPort: smtpPort,
        fromEmail: smtpFrom || 'noreply@jecrc.edu.in'
    };
};

/**
 * Performs complete environment validation
 * @param {Object} options - Validation options
 * @param {boolean} options.strict - Throw errors instead of returning results
 * @param {boolean} options.logResults - Log validation results to console
 * @returns {Object} - Complete validation result
 */
export const validateEnvironment = (options = {}) => {
    const {
        strict = false,
        logResults = process.env.NODE_ENV !== 'production'
    } = options;

    // Run all validations
    const requiredValidation = validateRequiredEnvVars();
    const optionalValidation = validateOptionalEnvVars();
    const departmentValidation = validateDepartmentEmails();
    const jwtValidation = validateJWTSecret();
    const supabaseValidation = validateSupabaseConfig();
    const emailValidation = validateEmailConfig();

    // Compile results
    const results = {
        isValid: requiredValidation.isValid &&
            jwtValidation.isValid &&
            supabaseValidation.isValid &&
            emailValidation.isValid,
        summary: {
            required: requiredValidation,
            optional: optionalValidation,
            departmentEmails: departmentValidation,
            jwt: jwtValidation,
            supabase: supabaseValidation,
            email: emailValidation,
            timestamp: new Date().toISOString()
        },
        errors: [],
        warnings: []
    };

    // Collect errors
    if (!requiredValidation.isValid) {
        results.errors.push(`Missing required environment variables: ${requiredValidation.missing.join(', ')}`);
    }

    if (!jwtValidation.isValid) {
        results.errors.push(`JWT validation failed: ${jwtValidation.error}`);
    }

    if (!supabaseValidation.isValid) {
        results.errors.push(...supabaseValidation.issues.map(issue => `Supabase: ${issue}`));
    }

    if (!emailValidation.isValid) {
        results.errors.push(...emailValidation.issues.map(issue => `Email: ${issue}`));
    }

    // Collect warnings (removed department email warnings - not needed)
    if (optionalValidation.missing.length > 0 && process.env.NODE_ENV === 'development') {
        const missingVars = optionalValidation.missing.filter(v => !v.includes('EMAIL'));
        if (missingVars.length > 0) {
            results.warnings.push(`Optional environment variables not set: ${missingVars.slice(0, 3).join(', ')}`);
        }
    }

    // Handle strict mode
    if (strict && !results.isValid) {
        throw new Error(`Environment validation failed:\n${results.errors.join('\n')}`);
    }

    // Log results in development
    if (logResults) {
        console.log('🔧 Environment Validation Results:');
        console.log(`✅ Valid: ${results.isValid}`);
        console.log(`📝 Required vars: ${requiredValidation.totalPresent}/${requiredValidation.totalRequired}`);

        if (results.errors.length > 0) {
            console.error('❌ Errors:', results.errors);
        }

        if (results.warnings.length > 0 && results.warnings.some(w => !w.includes('not set'))) {
            console.warn('⚠️ Warnings:', results.warnings);
        }
    }

    return results;
};

/**
 * Gets environment configuration for display
 * @returns {Object} - Environment configuration summary
 */
export const getEnvConfig = () => {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        supabase: {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing',
            anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Missing',
            serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configured' : '❌ Missing'
        },
        jwt: {
            secret: process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing',
            length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
        },
        email: {
            smtpUser: process.env.SMTP_USER ? '✅ Configured' : '❌ Missing',
            smtpPass: process.env.SMTP_PASS ? '✅ Configured' : '❌ Missing',
            smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
            smtpPort: process.env.SMTP_PORT || '587',
            from: process.env.SMTP_FROM || 'noreply@jecrc.edu.in'
        },
        baseUrl: 'https://nodues.jecrcuniversity.edu.in'
    };
};