# Issue: Security and Validation Issues

## Problem Description
Several security and input validation issues were identified throughout the application that could lead to vulnerabilities or unexpected behavior.

## Issues Identified

### 1. JWT Token Generation Redundancy
**Location**: `src/app/api/notify/route.js` (Lines 23-43)

**Problem**: JWT token generation logic is duplicated and not shared with the emailService.js

```javascript
const getJwk = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    return {
        kty: 'oct',
        k: Buffer.from(secret).toString('base64'),
    };
};

async function createToken(payload) {
    const jwk = getJwk();
    const key = await importJWK(jwk, 'HS256');
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(key);
    return token;
}
```

**Impact**: 
- Code duplication
- Potential inconsistencies in token generation
- Maintenance overhead

### 2. File Upload Without Validation
**Location**: `src/app/no-dues-form/page.js` (Lines 103-117)

**Problem**: File upload implementation lacks proper validation and security checks

```javascript
const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // In a real app, you'd upload to storage and get a URL
    // For now, we'll just use a placeholder or base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        alumni_screenshot_url: event.target.result
      }));
    };
    reader.readAsDataURL(file);
};
```

**Issues**:
- No file type validation
- No file size limits
- No virus/malware scanning
- Base64 encoding in frontend (inefficient)
- No server-side validation before storage

### 3. Authentication State Management Issues
**Location**: Multiple components

**Problem**: Authentication state is fetched in multiple places without proper error handling

**Examples**:
- `src/app/no-dues-form/page.js` - Manual session fetching
- `src/app/staff/dashboard/page.js` - Duplicate auth logic
- `src/components/admin/AdminDashboard.jsx` - Repeated auth checks

### 4. Missing Input Sanitization
**Location**: Email templates and user inputs

**Problem**: User inputs are not properly sanitized in some contexts

```javascript
// In notification route - properly escaped
const html = `
  <div>
    ${escapeHtml(student_name)}
    ${escapeHtml(registration_no)}
  </div>
`;

// But in other places, inputs may not be sanitized
```

### 5. Environment Variable Validation
**Location**: Application startup and API routes

**Problem**: Missing validation for critical environment variables

**Examples**:
- `JWT_SECRET` validation only in notify route
- No validation for database connection strings
- No validation for email service credentials

## Impact Assessment

- **Security**: High - File upload vulnerabilities and JWT inconsistencies
- **Reliability**: Medium - Missing environment variable validation
- **Maintainability**: Medium - Duplicated authentication logic
- **Performance**: Low - Base64 encoding in frontend

## Recommended Solutions

### 1. JWT Token Service Consolidation
Create a shared JWT service:

```javascript
// lib/jwtService.js
export const createSecureToken = async (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const key = await importJWK({
    kty: 'oct',
    k: Buffer.from(secret).toString('base64'),
  }, 'HS256');

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
};

export const validateToken = async (token) => {
  // Token validation logic
};
```

### 2. File Upload Security Implementation
Implement proper file upload handling:

```javascript
// lib/fileUpload.js
export const validateFile = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!file) {
    throw new Error('No file provided');
  }

  if (file.size > maxSize) {
    throw new Error('File size too large');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }

  return true;
};

export const uploadToStorage = async (file, userId) => {
  // Proper server-side upload logic
};
```

### 3. Authentication Hook/Service
Create reusable authentication logic:

```javascript
// hooks/useAuth.js
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setUser({ ...session.user, profile });
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  return { user, loading };
};
```

### 4. Environment Variable Validation
Add comprehensive environment validation:

```javascript
// lib/envValidation.js
export const validateEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'RESEND_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate email configuration
  validateEmailConfiguration();
};
```

### 5. Input Sanitization Middleware
Add input sanitization:

```javascript
// lib/sanitization.js
export const sanitizeHtml = (input) => {
  return String(input || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');
};

export const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};
```

## Implementation Priority

### Critical (Fix Before Deployment):
1. **File upload validation** - Security vulnerability
2. **Environment variable validation** - Application stability
3. **JWT token consolidation** - Security consistency

### High (Fix Soon):
1. **Authentication logic consolidation** - Code quality
2. **Input sanitization** - Security hardening

## Files to Create/Modify

### New Files:
- `src/lib/jwtService.js` - Centralized JWT handling
- `src/lib/fileUpload.js` - Secure file upload logic
- `src/hooks/useAuth.js` - Reusable authentication hook
- `src/lib/envValidation.js` - Environment validation
- `src/lib/sanitization.js` - Input sanitization utilities

### Files to Modify:
- `src/app/api/notify/route.js` - Use centralized JWT service
- `src/app/no-dues-form/page.js` - Implement proper file upload
- Multiple components - Use authentication hook

## Testing Requirements

### Security Testing:
1. **File upload** with malicious files
2. **JWT token** tampering attempts
3. **Input sanitization** with malicious inputs
4. **Environment variable** validation

### Integration Testing:
1. **Authentication flows** across different components
2. **File upload** end-to-end functionality
3. **Email token** generation and validation

## Priority
**High** - Security issues should be addressed before deployment to prevent vulnerabilities and ensure system stability.