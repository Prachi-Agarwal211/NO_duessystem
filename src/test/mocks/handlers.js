import { rest } from 'msw';
import {
  mockUsers,
  mockDepartments,
  mockForms,
  mockStatusRecords,
  mockStats,
  mockAuthResponse,
  mockAuditLog,
} from './mockData';

// Helper function to check authentication
const requireAuth = (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.includes('Bearer')) {
    return { error: 'Unauthorized', status: 401 };
  }
  return null;
};

// Helper function to check role
const requireRole = (req, allowedRoles) => {
  const authError = requireAuth(req);
  if (authError) return authError;

  // In tests, we'll mock the user profile
  return null;
};

export const handlers = [
  // Authentication endpoints
  rest.post('https://test.supabase.co/auth/v1/token*', (req, res, ctx) => {
    return res(ctx.json(mockAuthResponse));
  }),

  rest.post('https://test.supabase.co/auth/v1/signup', (req, res, ctx) => {
    return res(ctx.json({
      user: mockAuthResponse.user,
      session: mockAuthResponse.session,
    }));
  }),

  rest.get('https://test.supabase.co/rest/v1/profiles*', (req, res, ctx) => {
    const authError = requireAuth(req);
    if (authError) {
      return res(ctx.status(authError.status), ctx.json({ error: authError.error }));
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('id') || 'eq.student-uuid-1';

    if (userId.includes('student')) {
      return res(ctx.json(mockUsers.student));
    } else if (userId.includes('department')) {
      return res(ctx.json(mockUsers.department));
    } else if (userId.includes('registrar')) {
      return res(ctx.json(mockUsers.registrar));
    } else {
      return res(ctx.json(mockUsers.admin));
    }
  }),

  // Departments endpoint
  rest.get('https://test.supabase.co/rest/v1/departments*', (req, res, ctx) => {
    return res(ctx.json(mockDepartments));
  }),

  // No Dues Forms endpoints
  rest.get('https://test.supabase.co/rest/v1/no_dues_forms*', (req, res, ctx) => {
    const authError = requireAuth(req);
    if (authError) {
      return res(ctx.status(authError.status), ctx.json({ error: authError.error }));
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      return res(ctx.json(mockForms.pending));
    }

    return res(ctx.json([mockForms.pending, mockForms.completed]));
  }),

  rest.post('https://test.supabase.co/rest/v1/no_dues_forms*', (req, res, ctx) => {
    const authError = requireAuth(req);
    if (authError) {
      return res(ctx.status(authError.status), ctx.json({ error: authError.error }));
    }

    return res(ctx.json({
      ...mockForms.pending,
      id: 'new-form-uuid',
      created_at: new Date().toISOString(),
    }));
  }),

  rest.patch('https://test.supabase.co/rest/v1/no_dues_forms*', (req, res, ctx) => {
    const authError = requireAuth(req);
    if (authError) {
      return res(ctx.status(authError.status), ctx.json({ error: authError.error }));
    }

    return res(ctx.json(mockForms.completed));
  }),

  // No Dues Status endpoints
  rest.get('https://test.supabase.co/rest/v1/no_dues_status*', (req, res, ctx) => {
    const authError = requireAuth(req);
    if (authError) {
      return res(ctx.status(authError.status), ctx.json({ error: authError.error }));
    }

    const url = new URL(req.url);
    const formId = url.searchParams.get('form_id');

    if (formId) {
      return res(ctx.json(mockStatusRecords.filter(s => s.form_id === formId)));
    }

    return res(ctx.json(mockStatusRecords));
  }),

  rest.patch('https://test.supabase.co/rest/v1/no_dues_status*', (req, res, ctx) => {
    const authError = requireAuth(req);
    if (authError) {
      return res(ctx.status(authError.status), ctx.json({ error: authError.error }));
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      return res(ctx.json({
        ...mockStatusRecords[0],
        status: 'approved',
        action_at: new Date().toISOString(),
      }));
    }

    return res(ctx.json(mockStatusRecords[0]));
  }),

  // Staff Dashboard API
  rest.get('/api/staff/dashboard*', (req, res, ctx) => {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (userId.includes('registrar')) {
      return res(ctx.json({
        success: true,
        data: {
          applications: [mockForms.completed],
          pagination: { total: 1, totalPages: 1 },
        },
      }));
    }

    return res(ctx.json({
      success: true,
      data: {
        applications: [{ no_dues_forms: mockForms.pending }],
        pagination: { total: 1, totalPages: 1 },
      },
    }));
  }),

  // Staff Action API
  rest.put('/api/staff/action', async (req, res, ctx) => {
    const body = await req.json();
    const { formId, departmentName, action, reason, userId } = body;

    return res(ctx.json({
      success: true,
      data: {
        status: {
          ...mockStatusRecords[0],
          status: action === 'approve' ? 'approved' : 'rejected',
          action_at: new Date().toISOString(),
          rejection_reason: reason || null,
        },
        form: action === 'approve' ? mockForms.completed : mockForms.pending,
        message: `Successfully ${action}d the no dues request for ${mockForms.pending.student_name}`,
      },
    }));
  }),

  // Staff Student Detail API
  rest.get('/api/staff/student/:id*', (req, res, ctx) => {
    const { id } = req.params;

    return res(ctx.json({
      success: true,
      data: {
        form: mockForms.pending,
        departmentStatuses: mockDepartments.map(dept => ({
          department_name: dept.name,
          display_name: dept.display_name,
          status: mockStatusRecords.find(s => s.department_name === dept.name)?.status || 'pending',
          rejection_reason: mockStatusRecords.find(s => s.department_name === dept.name)?.rejection_reason || null,
          action_at: mockStatusRecords.find(s => s.department_name === dept.name)?.action_at || null,
          action_by: mockStatusRecords.find(s => s.department_name === dept.name)?.action_by || null,
        })),
      },
    }));
  }),

  // Admin Dashboard API
  rest.get('/api/admin/dashboard*', (req, res, ctx) => {
    return res(ctx.json({
      applications: [mockForms.pending, mockForms.completed],
      pagination: {
        total: 2,
        totalPages: 1,
        page: 1,
        limit: 20,
      },
    }));
  }),

  // Admin Stats API
  rest.get('/api/admin/stats*', (req, res, ctx) => {
    return res(ctx.json(mockStats));
  }),

  // Admin Reports API
  rest.get('/api/admin/reports*', (req, res, ctx) => {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    if (type === 'department-performance') {
      return res(ctx.json({
        reportType: 'department-performance',
        data: mockStats.departmentStats,
      }));
    }

    if (type === 'requests-over-time') {
      return res(ctx.json({
        reportType: 'requests-over-time',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          data: {
            '2024-01-01': { pending: 1, completed: 0 },
            '2024-01-02': { pending: 0, completed: 1 },
          },
        },
      }));
    }

    return res(ctx.status(400), ctx.json({ error: 'Invalid report type' }));
  }),

  // Audit Log API
  rest.get('https://test.supabase.co/rest/v1/audit_log*', (req, res, ctx) => {
    return res(ctx.json(mockAuditLog));
  }),

  // Storage API (for file uploads)
  rest.post('https://test.supabase.co/storage/v1/object/*', (req, res, ctx) => {
    return res(ctx.json({
      Key: 'test-file.jpg',
      Location: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
    }));
  }),

  // File upload API
  rest.post('/api/upload', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      url: 'https://test-storage.com/uploaded-file.jpg',
    }));
  }),

  // Catch-all for unhandled requests
  rest.get('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} ${req.url.pathname}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),

  rest.post('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} ${req.url.pathname}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),

  rest.put('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} ${req.url.pathname}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),

  rest.patch('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} ${req.url.pathname}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),
];
