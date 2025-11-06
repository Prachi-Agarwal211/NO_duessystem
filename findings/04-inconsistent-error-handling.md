# Issue: Inconsistent Error Handling Across API Routes

## Problem Description
Different API routes implement error handling differently, leading to inconsistent error responses and potential information leakage.

## Error Handling Patterns Found

### Pattern 1: Proper Error Response (Used in admin routes)
```javascript
// src/app/api/admin/dashboard/route.js
if (applicationsError) {
  throw applicationsError;
}
// ...
} catch (error) {
  console.error('Admin dashboard API error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

### Pattern 2: Generic Error Response (Used in staff routes)
```javascript
// src/app/api/staff/dashboard/route.js
if (completedError) {
  return NextResponse.json({ error: completedError.message }, { status: 500 });
}
// ...
} catch (error) {
  console.error('Staff Dashboard API Error:', error);
  return NextResponse.json({ 
    success: false,
    error: 'Internal server error' 
  }, { status: 500 });
}
```

### Pattern 3: Inconsistent Response Format (Used in notify route)
```javascript
// src/app/api/notify/route.js
if (result?.error) {
  return Response.json({ ok: false, error: result.error?.message || "Resend error" }, { status: 500 });
}
// ...
} catch (err) {
  return Response.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
}
```

## Issues Identified

1. **Inconsistent Response Formats**:
   - Some routes return `{ error: 'message' }`
   - Others return `{ success: false, error: 'message' }`
   - Notify route returns `{ ok: false, error: 'message' }`

2. **Error Message Exposure**:
   - Staff routes expose internal database errors to clients
   - Admin routes properly sanitize error messages
   - Inconsistent logging practices

3. **Different HTTP Libraries**:
   - Most routes use `NextResponse.json()`
   - Notify route uses `Response.json()`

4. **Inconsistent Status Code Usage**:
   - Some routes use appropriate HTTP status codes
   - Others use generic 500 for all errors

## Impact Assessment

- **Security**: Medium - Potential information leakage through error messages
- **API Consistency**: High - Different response formats confuse frontend developers
- **Error Tracking**: Medium - Inconsistent logging makes debugging difficult
- **Client Handling**: High - Frontend needs to handle multiple error response formats

## Specific Issues by Route

### 1. Staff Dashboard API (`src/app/api/staff/dashboard/route.js`)
**Problems**:
- Exposes database error messages: `return NextResponse.json({ error: completedError.message }, { status: 500 });`
- Inconsistent response format compared to other routes
- Missing proper error sanitization

### 2. Staff Stats API (`src/app/api/staff/stats/route.js`)
**Problems**:
- Generic error handling: `return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });`
- Doesn't differentiate between different types of errors
- Missing detailed logging for debugging

### 3. Notify API (`src/app/api/notify/route.js`)
**Problems**:
- Uses different response library (`Response.json()` vs `NextResponse.json()`)
- Different response format (`{ ok: false }` vs `{ error: 'message' }`)
- Inconsistent error property naming

## Recommended Solution

### Option 1: Standardize Error Response Format (Recommended)
Create a unified error response format across all API routes:

```javascript
// lib/apiResponse.js
export const createErrorResponse = (message, status = 500, details = null) => {
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV === 'development') {
    errorResponse.details = details;
  }

  return NextResponse.json(errorResponse, { status });
};

export const createSuccessResponse = (data, meta = null) => {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response);
};
```

### Option 2: Route-Specific Error Handlers
Create error handling middleware for different route groups:

```javascript
// middleware/errorHandler.js
export const handleApiError = (error, routeType = 'default') => {
  console.error(`${routeType} API Error:`, error);

  // Sanitize error message based on route type
  const sanitizedMessage = sanitizeErrorMessage(error.message, routeType);

  return NextResponse.json({
    success: false,
    error: sanitizedMessage
  }, { status: 500 });
};
```

## Implementation Steps

### Step 1: Create Error Handling Utilities
Create `src/lib/apiResponse.js` with standardized response functions.

### Step 2: Update Staff Dashboard API
Replace error handling with standardized approach:

```javascript
// Before
if (completedError) {
  return NextResponse.json({ error: completedError.message }, { status: 500 });
}

// After
if (completedError) {
  console.error('Database error in staff dashboard:', completedError);
  return createErrorResponse('Failed to fetch dashboard data', 500);
}
```

### Step 3: Update Staff Stats API
Improve error specificity:

```javascript
// Before
if (totalError || completedError || pendingError) {
  return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
}

// After
if (totalError) {
  console.error('Error fetching total forms:', totalError);
  return createErrorResponse('Failed to fetch form statistics', 500);
}
// ... handle other errors specifically
```

### Step 4: Update Notify API
Standardize response format and library usage:

```javascript
// Before
return Response.json({ ok: false, error: result.error?.message || "Resend error" }, { status: 500 });

// After
return NextResponse.json({
  success: false,
  error: 'Failed to send notification email'
}, { status: 500 });
```

## Additional Improvements

### 1. Enhanced Logging
```javascript
// Add structured logging
const logError = (error, context) => {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userId: context.userId,
    route: context.route
  });
};
```

### 2. Error Classification
```javascript
const classifyError = (error) => {
  if (error.code === 'PGRST116') return 'NOT_FOUND';
  if (error.code === 'PGRST301') return 'UNAUTHORIZED';
  if (error.message.includes('JWT')) return 'AUTHENTICATION_ERROR';
  return 'INTERNAL_ERROR';
};
```

## Priority
**High** - Inconsistent error handling affects API reliability, security, and developer experience. Should be standardized before deployment.