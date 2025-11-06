// Mock data for testing
export const mockUsers = {
  student: {
    id: 'student-uuid-1',
    email: 'student@test.com',
    full_name: 'Test Student',
    role: 'student',
    registration_no: '2021A1234',
    department_name: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  department: {
    id: 'department-uuid-1',
    email: 'dept@test.com',
    full_name: 'Department Staff',
    role: 'department',
    registration_no: null,
    department_name: 'LIBRARY',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  registrar: {
    id: 'registrar-uuid-1',
    email: 'registrar@test.com',
    full_name: 'Test Registrar',
    role: 'registrar',
    registration_no: null,
    department_name: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  admin: {
    id: 'admin-uuid-1',
    email: 'admin@test.com',
    full_name: 'Test Admin',
    role: 'admin',
    registration_no: null,
    department_name: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export const mockDepartments = [
  { name: 'LIBRARY', display_name: 'Library', display_order: 1 },
  { name: 'IT_DEPARTMENT', display_name: 'IT Department', display_order: 2 },
  { name: 'HOSTEL', display_name: 'Hostel', display_order: 3 },
  { name: 'REGISTRAR', display_name: 'Registrar', display_order: 4 },
];

export const mockForms = {
  pending: {
    id: 'form-uuid-1',
    user_id: 'student-uuid-1',
    student_name: 'Test Student',
    registration_no: '2021A1234',
    session_from: '2021',
    session_to: '2025',
    parent_name: 'Parent Name',
    school: 'Engineering',
    course: 'B.Tech',
    branch: 'CSE',
    contact_no: '9876543210',
    alumni_screenshot_url: null,
    certificate_url: null,
    final_certificate_generated: false,
    status: 'pending',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  completed: {
    id: 'form-uuid-2',
    user_id: 'student-uuid-1',
    student_name: 'Completed Student',
    registration_no: '2021A5678',
    session_from: '2021',
    session_to: '2025',
    parent_name: 'Parent Name',
    school: 'Engineering',
    course: 'B.Tech',
    branch: 'CSE',
    contact_no: '9876543210',
    alumni_screenshot_url: 'https://example.com/screenshot.jpg',
    certificate_url: 'https://example.com/certificate.pdf',
    final_certificate_generated: true,
    status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export const mockStatusRecords = [
  {
    id: 'status-uuid-1',
    form_id: 'form-uuid-1',
    department_name: 'LIBRARY',
    status: 'approved',
    action_by_user_id: 'department-uuid-1',
    action_at: '2024-01-02T00:00:00Z',
    rejection_reason: null,
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'status-uuid-2',
    form_id: 'form-uuid-1',
    department_name: 'IT_DEPARTMENT',
    status: 'pending',
    action_by_user_id: null,
    action_at: null,
    rejection_reason: null,
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'status-uuid-3',
    form_id: 'form-uuid-1',
    department_name: 'HOSTEL',
    status: 'rejected',
    action_by_user_id: 'department-uuid-2',
    action_at: '2024-01-03T00:00:00Z',
    rejection_reason: 'Outstanding dues found',
    updated_at: '2024-01-03T00:00:00Z',
  },
];

export const mockStats = {
  overallStats: [
    {
      total_requests: 25,
      completed_requests: 15,
      pending_requests: 8,
      rejected_requests: 2,
      in_progress_requests: 0,
    },
  ],
  departmentStats: [
    {
      department_name: 'LIBRARY',
      total_requests: 25,
      approved_requests: 20,
      rejected_requests: 3,
      pending_requests: 2,
      avg_response_time: '2h 30m',
      approval_rate: '80%',
      rejection_rate: '12%',
    },
    {
      department_name: 'IT_DEPARTMENT',
      total_requests: 25,
      approved_requests: 22,
      rejected_requests: 1,
      pending_requests: 2,
      avg_response_time: '1h 45m',
      approval_rate: '88%',
      rejection_rate: '4%',
    },
  ],
};

export const mockAuthResponse = {
  user: {
    id: 'student-uuid-1',
    email: 'student@test.com',
    created_at: '2024-01-01T00:00:00Z',
  },
  session: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: mockUsers.student,
  },
};

export const mockAuditLog = [
  {
    id: 'audit-uuid-1',
    user_id: 'department-uuid-1',
    action_type: 'status_update',
    action_details: {
      form_id: 'form-uuid-1',
      department_name: 'LIBRARY',
      action: 'approved',
      student_name: 'Test Student',
    },
    table_name: 'no_dues_status',
    record_id: 'status-uuid-1',
    created_at: '2024-01-02T00:00:00Z',
  },
];

// Helper functions for tests
export const createMockResponse = (data, ok = true, status = 200) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
});

export const createMockRequest = (body = null) => ({
  json: jest.fn().mockResolvedValue(body),
  url: 'https://test.supabase.co/rest/v1/test',
  method: 'GET',
});
