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
    'RESEND_API_KEY'
];

const OPTIONAL_ENV_VARS = [
    'NEXT_PUBLIC_BASE_URL',
    'RESEND_FROM',
    // Department emails - should be set for production
    'SCHOOL_HOD_EMAIL',
    'SCHOOL_EMAIL',
    'LIBRARY_EMAIL',
    'IT_DEPARTMENT_EMAIL',
    'HOSTEL_EMAIL',
    'MESS_EMAIL',
    'CANTEEN_EMAIL',
    'TPO_EMAIL',
    'ALUMNI_EMAIL',
    'ACCOUNTS_EMAIL',
    'REGISTRAR_EMAIL',
    'EXAM_CELL_EMAIL',
    'SPORTS_EMAIL'
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
 * Validates department email configurations
 * @returns {Object} - Validation result for department emails
 */
export const validateDepartmentEmails = () => {
    const departmentEmails = {
        "School (HOD/Dean)": process.env.SCHOOL_HOD_EMAIL || process.env.SCHOOL_EMAIL,
        "Library": process.env.LIBRARY_EMAIL,
        "IT Department": process.env.IT_DEPARTMENT_EMAIL,
        "Hostel": process.env.HOSTEL_EMAIL,
        "Mess": process.env.MESS_EMAIL,
        "Canteen": process.env.CANTEEN_EMAIL,
        "TPO": process.env.TPO_EMAIL,
        "Alumni Association": process.env.ALUMNI_EMAIL,
        "Accounts Department": process.env.ACCOUNTS_EMAIL,
        "DY. Registrar Office": process.env.REGISTRAR_EMAIL,
        "Examination Cell": process.env.EXAM_CELL_EMAIL,
        "Sports Department": process.env.SPORTS_EMAIL,
    };

    const configured = [];
    const missing = [];

    for (const [department, email] of Object.entries(departmentEmails)) {
        if (email) {
            configured.push({ department, email });
        } else {
            missing.push(department);
        }
    }

    return {
        allConfigured: missing.length === 0,
        configured,
        missing,
        totalDepartments: Object.keys(departmentEmails).length,
        totalConfigured: configured.length
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

    // Check if URLs match (common configuration error)
    if (url && serviceKey && !serviceKey.includes(new URL(url).hostname)) {
        issues.push('Service role key does not match the Supabase URL');
    }

    return {
        isValid: issues.length === 0,
        issues,
        urlConfigured: !!url,
        anonKeyConfigured: !!anonKey,
        serviceKeyConfigured: !!serviceKey
    };
};

/**
 * Validates email service configuration
 * @returns {Object} - Validation result for email config
 */
export const validateEmailConfig = () => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM;

    const issues = [];

    if (!apiKey || apiKey.length < 20) {
        issues.push('RESEND_API_KEY must be a valid Resend API key');
    }

    if (fromEmail && !fromEmail.includes('@')) {
        issues.push('RESEND_FROM must be a valid email address');
    }

    // Check for default/test values
    if (apiKey === 're_your_resend_api_key_here') {
        issues.push('RESEND_API_KEY appears to be a default value');
    }

    return {
        isValid: issues.length === 0,
        issues,
        apiKeyConfigured: !!apiKey,
        fromEmailConfigured: !!fromEmail,
        fromEmail: fromEmail || 'noreply@jecrc.edu.in'
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

    // Collect warnings
    if (!departmentValidation.allConfigured && process.env.NODE_ENV === 'production') {
        results.warnings.push(`Missing department email configurations: ${departmentValidation.missing.join(', ')}`);
    }

    if (optionalValidation.missing.length > 0 && process.env.NODE_ENV === 'development') {
        results.warnings.push(`Optional environment variables not set: ${optionalValidation.missing.slice(0, 5).join(', ')}`);
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
        console.log(`📧 Department emails: ${departmentValidation.totalConfigured}/${departmentValidation.totalDepartments}`);

        if (results.errors.length > 0) {
            console.error('❌ Errors:', results.errors);
        }

        if (results.warnings.length > 0) {
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
            apiKey: process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Missing',
            from: process.env.RESEND_FROM || 'default'
        },
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    };
};