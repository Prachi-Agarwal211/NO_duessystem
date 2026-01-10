# JECRC No Dues System - API Documentation

## Authentication
All authenticated endpoints require a Bearer token in the `Authorization` header.
```http
Authorization: Bearer <your_jwt_token>
```
The token is obtained via Supabase Auth login.

## Error Handling
Standard error response format:
```json
{
  "success": false,
  "error": "Error message description",
  "details": { ... }, // Optional additional details
  "timestamp": "2024-01-11T12:00:00.000Z"
}
```

## Endpoints

### 1. Student Submission
**POST** `/api/student`
Submit a new No Dues application.

**Request Body:**
```json
{
  "registration_no": "21BCON678",
  "student_name": "John Doe",
  "contact_no": "9876543210",
  "school": "UUID",
  "course": "UUID",
  // ... other fields
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": { "id": "...", "status": "pending", ... },
  "message": "Application submitted successfully"
}
```

### 2. Staff Action
**PUT** `/api/staff/action`
Approve or Reject a student application for a specific department.

**Headers:**
- `Authorization`: Bearer <token>

**Request Body:**
```json
{
  "formId": "UUID",
  "departmentName": "library",
  "action": "approve", // or "reject"
  "reason": "Book pending" // Required if action is reject
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Successfully approved the no dues request"
}
```

### 3. File Upload
**POST** `/api/upload`
Upload a file (PDF/Image) to storage.

**Headers:**
- `Content-Type`: multipart/form-data

**Form Fields:**
- `file`: File object
- `bucket`: "no-dues-files" (default)

**Success Response (200):**
```json
{
  "success": true,
  "url": "https://...",
  "path": "folder/filename.pdf"
}
```

### 4. Admin Dashboard
**GET** `/api/admin/dashboard`
Fetch statistics and recent activity.

**Headers:**
- `Authorization`: Bearer <token> (Admin Only)

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "pending": 45,
    "completed": 100,
    "rejected": 5
  }
}
```

## Rate Limits
- **Read**: 60 requests/minute
- **Write/Action**: 10 requests/minute (Strict)
- **Upload**: 15 requests/minute

## Response Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (Validation Failed)
- `401`: Unauthorized (Login required)
- `403`: Forbidden (Role mismatch)
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error
