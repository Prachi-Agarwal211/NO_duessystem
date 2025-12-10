/**
 * Input Validation Middleware
 * 
 * Comprehensive validation utilities for sanitizing and validating user input.
 * Prevents XSS, SQL injection, and other common attacks.
 */

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required', 'email');
  }

  const sanitized = email.trim().toLowerCase();
  
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new ValidationError('Invalid email format', 'email');
  }

  if (sanitized.length > 254) {
    throw new ValidationError('Email is too long (max 254 characters)', 'email');
  }

  return sanitized;
}

/**
 * Validate phone number
 */
export function validatePhone(phone, countryCode = '+91') {
  if (!phone || typeof phone !== 'string') {
    throw new ValidationError('Phone number is required', 'phone');
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check length (10 digits for India)
  if (digits.length < 6 || digits.length > 15) {
    throw new ValidationError('Invalid phone number length', 'phone');
  }

  // Validate first digit (India: 6-9)
  if (countryCode === '+91' && !/^[6-9]/.test(digits)) {
    throw new ValidationError('Invalid phone number format', 'phone');
  }

  return digits;
}

/**
 * Validate registration number (JECRC format)
 */
export function validateRegistrationNumber(regNo) {
  if (!regNo || typeof regNo !== 'string') {
    throw new ValidationError('Registration number is required', 'registration_no');
  }

  const sanitized = regNo.trim().toUpperCase();
  
  // JECRC format: Usually starts with year followed by alphanumeric
  // Example: 21ESKEC001, 22ESKCS123, etc.
  const regNoRegex = /^[0-9]{2}[A-Z]{2,6}[0-9]{3,4}$/;
  
  if (!regNoRegex.test(sanitized)) {
    throw new ValidationError(
      'Invalid registration number format (Expected: YYBBBBNNNN)',
      'registration_no'
    );
  }

  if (sanitized.length < 8 || sanitized.length > 15) {
    throw new ValidationError('Registration number length invalid', 'registration_no');
  }

  return sanitized;
}

/**
 * Validate name (student/parent name)
 */
export function validateName(name, fieldName = 'name') {
  if (!name || typeof name !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const sanitized = name.trim();
  
  // Allow letters, spaces, dots, hyphens, apostrophes
  const nameRegex = /^[A-Za-z\s.\-']+$/;
  
  if (!nameRegex.test(sanitized)) {
    throw new ValidationError(
      `${fieldName} can only contain letters, spaces, dots, hyphens, and apostrophes`,
      fieldName
    );
  }

  if (sanitized.length < 2) {
    throw new ValidationError(`${fieldName} must be at least 2 characters`, fieldName);
  }

  if (sanitized.length > 100) {
    throw new ValidationError(`${fieldName} is too long (max 100 characters)`, fieldName);
  }

  return sanitized;
}

/**
 * Validate year (session from/to)
 */
export function validateYear(year, fieldName = 'year') {
  if (!year) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
  
  if (isNaN(yearNum)) {
    throw new ValidationError(`${fieldName} must be a valid year`, fieldName);
  }

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 10; // Allow up to 10 years back
  const maxYear = currentYear + 5;  // Allow up to 5 years ahead

  if (yearNum < minYear || yearNum > maxYear) {
    throw new ValidationError(
      `${fieldName} must be between ${minYear} and ${maxYear}`,
      fieldName
    );
  }

  return yearNum;
}

/**
 * Validate UUID
 */
export function validateUUID(uuid, fieldName = 'id') {
  if (!uuid || typeof uuid !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }

  return uuid.toLowerCase();
}

/**
 * Validate file upload
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  } = options;

  if (!file) {
    throw new ValidationError('File is required', 'file');
  }

  // Check file size
  if (file.size > maxSize) {
    throw new ValidationError(
      `File size too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`,
      'file'
    );
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(
      `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`,
      'file'
    );
  }

  // Check file extension
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(ext)) {
    throw new ValidationError(
      `File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`,
      'file'
    );
  }

  // Check filename for dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1F]/;
  if (dangerousChars.test(file.name)) {
    throw new ValidationError('File name contains invalid characters', 'file');
  }

  return true;
}

/**
 * Validate URL
 */
export function validateURL(url, fieldName = 'url') {
  if (!url || typeof url !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new ValidationError('URL must use HTTP or HTTPS protocol', fieldName);
    }

    return urlObj.toString();
  } catch (error) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
}

/**
 * Validate action type (approve/reject)
 */
export function validateAction(action) {
  if (!action || typeof action !== 'string') {
    throw new ValidationError('Action is required', 'action');
  }

  const validActions = ['approve', 'reject', 'pending'];
  const sanitized = action.toLowerCase().trim();
  
  if (!validActions.includes(sanitized)) {
    throw new ValidationError(
      `Invalid action. Must be one of: ${validActions.join(', ')}`,
      'action'
    );
  }

  return sanitized;
}

/**
 * Validate and sanitize reason/message text
 */
export function validateMessage(message, minLength = 10, maxLength = 1000) {
  if (!message || typeof message !== 'string') {
    throw new ValidationError('Message is required', 'message');
  }

  const sanitized = sanitizeString(message, maxLength);
  
  if (sanitized.length < minLength) {
    throw new ValidationError(
      `Message must be at least ${minLength} characters`,
      'message'
    );
  }

  return sanitized;
}

/**
 * Comprehensive form validator
 * Validates multiple fields at once and returns all errors
 */
export function validateForm(data, schema) {
  const errors = {};
  const validated = {};

  for (const [field, rules] of Object.entries(schema)) {
    try {
      const value = data[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${rules.label || field} is required`;
        continue;
      }

      // Skip validation if not required and empty
      if (!rules.required && !value) {
        continue;
      }

      // Type-specific validation
      switch (rules.type) {
        case 'email':
          validated[field] = validateEmail(value);
          break;
        
        case 'phone':
          validated[field] = validatePhone(value);
          break;
        
        case 'registration_no':
          validated[field] = validateRegistrationNumber(value);
          break;
        
        case 'name':
          validated[field] = validateName(value, rules.label || field);
          break;
        
        case 'year':
          validated[field] = validateYear(value, rules.label || field);
          break;
        
        case 'uuid':
          validated[field] = validateUUID(value, rules.label || field);
          break;
        
        case 'action':
          validated[field] = validateAction(value);
          break;
        
        case 'message':
          validated[field] = validateMessage(
            value,
            rules.minLength,
            rules.maxLength
          );
          break;
        
        case 'string':
          validated[field] = sanitizeString(value, rules.maxLength);
          if (rules.minLength && validated[field].length < rules.minLength) {
            errors[field] = `${rules.label || field} must be at least ${rules.minLength} characters`;
          }
          break;
        
        default:
          validated[field] = value;
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        errors[field] = error.message;
      } else {
        errors[field] = `Validation failed for ${field}`;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: validated
  };
}

/**
 * Middleware wrapper for API routes
 * 
 * Usage:
 * export async function POST(request) {
 *   const validation = await validateRequest(request, schema);
 *   if (!validation.isValid) {
 *     return NextResponse.json(validation.errors, { status: 400 });
 *   }
 *   // Use validation.data...
 * }
 */
export async function validateRequest(request, schema) {
  try {
    const body = await request.json();
    return validateForm(body, schema);
  } catch (error) {
    return {
      isValid: false,
      errors: { _error: 'Invalid JSON in request body' },
      data: {}
    };
  }
}

/**
 * Example validation schemas
 */
export const VALIDATION_SCHEMAS = {
  STUDENT_FORM: {
    registration_no: { type: 'registration_no', required: true, label: 'Registration Number' },
    student_name: { type: 'name', required: true, label: 'Student Name' },
    parent_name: { type: 'name', required: false, label: 'Parent Name' },
    personal_email: { type: 'email', required: true, label: 'Personal Email' },
    college_email: { type: 'email', required: true, label: 'College Email' },
    contact_no: { type: 'phone', required: true, label: 'Contact Number' },
    session_from: { type: 'year', required: false, label: 'Session From' },
    session_to: { type: 'year', required: false, label: 'Session To' }
  },

  STAFF_ACTION: {
    formId: { type: 'uuid', required: true, label: 'Form ID' },
    departmentName: { type: 'string', required: true, label: 'Department', minLength: 2, maxLength: 100 },
    action: { type: 'action', required: true, label: 'Action' },
    reason: { type: 'message', required: false, label: 'Reason', minLength: 10, maxLength: 500 }
  },

  REAPPLY: {
    formId: { type: 'uuid', required: true, label: 'Form ID' },
    registration_no: { type: 'registration_no', required: true, label: 'Registration Number' },
    student_reply_message: { type: 'message', required: true, label: 'Reply Message', minLength: 20, maxLength: 1000 }
  }
};

export default {
  sanitizeString,
  validateEmail,
  validatePhone,
  validateRegistrationNumber,
  validateName,
  validateYear,
  validateUUID,
  validateFile,
  validateURL,
  validateAction,
  validateMessage,
  validateForm,
  validateRequest,
  VALIDATION_SCHEMAS,
  ValidationError
};