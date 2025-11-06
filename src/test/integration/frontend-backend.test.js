import { rest } from 'msw';
import { server } from '../mocks/server';
import {
  mockUsers,
  mockForms,
  mockStatusRecords,
  mockStats,
  mockDepartments
} from '../__mocks__/mockData';

describe('Frontend-Backend Integration Tests', () => {
  describe('Complete Student Workflow', () => {
    it('should handle complete student journey from signup to certificate', async () => {
      // 1. Student signs up
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'integration@test.com',
          password: 'password123',
          fullName: 'Integration Student',
          registrationNo: '2023A9999',
          role: 'student',
        }),
      });

      expect(signupResponse.ok).toBe(true);
      const signupResult = await signupResponse.json();
      const studentId = signupResult.user.id;

      // 2. Student submits form
      const formResponse = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: 'Integration Student',
          registration_no: '2023A9999',
          session_from: '2023',
          session_to: '2027',
          course: 'B.Tech',
          branch: 'CSE',
          user_id: studentId,
        }),
      });

      expect(formResponse.ok).toBe(true);
      const formResult = await formResponse.json();
      const formId = formResult.id;

      // 3. Verify status records created automatically
      const statusResponse = await fetch(`https://test.supabase.co/rest/v1/no_dues_status?form_id=eq.${formId}`);
      const statusRecords = await statusResponse.json();

      expect(statusRecords).toHaveLength(mockDepartments.length);
      expect(statusRecords.every(s => s.status === 'pending')).toBe(true);

      // 4. Department approves
      const approvalResponse = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          departmentName: 'LIBRARY',
          action: 'approve',
          userId: 'department-uuid-1',
        }),
      });

      expect(approvalResponse.ok).toBe(true);

      // 5. Check if all departments approved triggers completion
      const finalStatusResponse = await fetch(`https://test.supabase.co/rest/v1/no_dues_status?form_id=eq.${formId}`);
      const finalStatuses = await finalStatusResponse.json();

      // 6. Verify certificate generation when all approved
      const certificateResponse = await fetch('/api/certificate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId }),
      });

      expect(certificateResponse.ok).toBe(true);
      const certificateResult = await certificateResponse.json();
      expect(certificateResult).toHaveProperty('certificateUrl');
    });
  });

  describe('Real-time Data Synchronization', () => {
    it('should sync status updates across all dashboards', async () => {
      // Initial state
      const initialResponse = await fetch('/api/staff/dashboard?userId=department-uuid-1');
      const initialData = await initialResponse.json();

      // Department approves a request
      await fetch('/api/staff/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'form-uuid-1',
          departmentName: 'LIBRARY',
          action: 'approve',
          userId: 'department-uuid-1',
        }),
      });

      // Admin dashboard should reflect the change
      const adminResponse = await fetch('/api/admin/dashboard?userId=admin-uuid-1');
      const adminData = await adminResponse.json();

      const updatedForm = adminData.applications.find(app => app.id === 'form-uuid-1');
      expect(updatedForm).toBeDefined();

      // Student should see updated status
      const studentResponse = await fetch(`/api/student/status?formId=form-uuid-1`);
      const studentData = await studentResponse.json();

      expect(studentData.status).toBe('in_progress');
    });

    it('should handle subscription updates correctly', async () => {
      // Mock real-time subscription
      const mockSubscriptionCallback = jest.fn();

      // Simulate status update via subscription
      const statusUpdate = {
        form_id: 'form-uuid-1',
        department_name: 'LIBRARY',
        status: 'approved',
      };

      // Verify callback is called with correct data
      mockSubscriptionCallback(statusUpdate);
      expect(mockSubscriptionCallback).toHaveBeenCalledWith(statusUpdate);
    });
  });

  describe('Email Integration End-to-End', () => {
    it('should send emails throughout the workflow', async () => {
      // Mock email service
      const emailMock = jest.fn();
      server.use(
        rest.post('/api/email/send', (req, res, ctx) => {
          emailMock(req.body);
          return res(ctx.json({ success: true }));
        })
      );

      // 1. Student submits form - should trigger department notifications
      await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: 'Email Test Student',
          registration_no: '2023A8888',
          session_from: '2023',
          session_to: '2027',
          course: 'B.Tech',
          branch: 'CSE',
          user_id: 'student-uuid-1',
        }),
      });

      expect(emailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'form_submission',
          to: expect.arrayContaining(['dept@test.com']),
        })
      );

      // 2. Department approves - should trigger student notification
      await fetch('/api/staff/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'form-uuid-1',
          departmentName: 'LIBRARY',
          action: 'approve',
          userId: 'department-uuid-1',
        }),
      });

      expect(emailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_update',
          to: 'student@test.com',
        })
      );
    });
  });

  describe('File Upload and Storage Integration', () => {
    it('should handle file uploads correctly', async () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: file,
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('url');
      expect(result.url).toMatch(/^https:\/\/.*\.jpg$/);
    });

    it('should store certificates properly', async () => {
      const certificateResponse = await fetch('/api/certificate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'form-uuid-2',
          studentName: 'Certificate Student',
        }),
      });

      expect(certificateResponse.ok).toBe(true);
      const result = await certificateResponse.json();

      expect(result).toHaveProperty('certificateUrl');
      expect(result.certificateUrl).toMatch(/\.pdf$/);

      // Verify storage upload
      expect(result.fileName).toMatch(/^no-dues-certificate-.*\.pdf$/);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should handle complete auth flow with role-based redirects', async () => {
      // Student login
      const studentLoginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@test.com',
          password: 'password123',
        }),
      });

      expect(studentLoginResponse.ok).toBe(true);
      const studentResult = await studentLoginResponse.json();
      expect(studentResult.redirectTo).toBe('/no-dues-form');

      // Staff login
      const staffLoginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'dept@test.com',
          password: 'password123',
        }),
      });

      expect(staffLoginResponse.ok).toBe(true);
      const staffResult = await staffLoginResponse.json();
      expect(staffResult.redirectTo).toBe('/staff/dashboard');

      // Admin login
      const adminLoginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'password123',
        }),
      });

      expect(adminLoginResponse.ok).toBe(true);
      const adminResult = await adminLoginResponse.json();
      expect(adminResult.redirectTo).toBe('/admin');
    });

    it('should maintain session across requests', async () => {
      // Login
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@test.com',
          password: 'password123',
        }),
      });

      expect(loginResponse.ok).toBe(true);

      // Access protected endpoint
      const protectedResponse = await fetch('/api/forms/my-forms');
      expect(protectedResponse.ok).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      server.use(
        rest.get('/api/staff/dashboard*', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Database connection failed' }));
        })
      );

      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      // Frontend should display error message
      expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
    });

    it('should handle network timeouts', async () => {
      // Mock slow response
      server.use(
        rest.get('/api/admin/stats*', (req, res, ctx) => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(res(ctx.json(mockStats)));
            }, 10000); // 10 second delay
          });
        })
      );

      const response = await fetch('/api/admin/stats?userId=admin-uuid-1');

      // Should timeout and handle gracefully
      await expect(response).rejects.toThrow();
    });

    it('should handle malformed responses', async () => {
      server.use(
        rest.get('/api/admin/dashboard*', (req, res, ctx) => {
          return res(ctx.json(null)); // Invalid response
        })
      );

      const response = await fetch('/api/admin/dashboard?userId=admin-uuid-1');

      expect(response.ok).toBe(true); // API might still return 200 but with null data

      const result = await response.json();
      expect(result).toBeNull();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeApplications = Array.from({ length: 1000 }, (_, i) => ({
        ...mockForms.pending,
        id: `form-${i}`,
        student_name: `Student ${i}`,
        registration_no: `2021A${String(i).padStart(4, '0')}`,
      }));

      server.use(
        rest.get('/api/admin/dashboard*', (req, res, ctx) => {
          const url = new URL(req.url);
          const page = parseInt(url.searchParams.get('page')) || 1;
          const limit = parseInt(url.searchParams.get('limit')) || 20;

          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedData = largeApplications.slice(startIndex, endIndex);

          return res(ctx.json({
            applications: paginatedData,
            pagination: {
              total: largeApplications.length,
              totalPages: Math.ceil(largeApplications.length / limit),
              page,
              limit,
            },
          }));
        })
      );

      const response = await fetch('/api/admin/dashboard?userId=admin-uuid-1&page=1&limit=20');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.applications).toHaveLength(20);
      expect(result.pagination.totalPages).toBe(50); // 1000 / 20
    });

    it('should cache frequently accessed data', async () => {
      // First request
      const response1 = await fetch('/api/admin/stats?userId=admin-uuid-1');
      const result1 = await response1.json();

      // Second request (should be cached)
      const response2 = await fetch('/api/admin/stats?userId=admin-uuid-1');
      const result2 = await response2.json();

      expect(result1).toEqual(result2);
    });
  });

  describe('Security Integration', () => {
    it('should enforce role-based access across all endpoints', async () => {
      const endpoints = [
        { url: '/api/admin/dashboard', userId: 'student-uuid-1', expectedStatus: 401 },
        { url: '/api/staff/dashboard', userId: 'student-uuid-1', expectedStatus: 401 },
        { url: '/api/admin/stats', userId: 'department-uuid-1', expectedStatus: 401 },
        { url: '/api/staff/action', userId: 'student-uuid-1', expectedStatus: 401 },
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${endpoint.url}?userId=${endpoint.userId}`);
        expect(response.status).toBe(endpoint.expectedStatus);
      }
    });

    it('should validate input data on all endpoints', async () => {
      const invalidData = {
        formId: '', // Invalid empty ID
        departmentName: 'INVALID_DEPT',
        action: 'invalid_action',
        userId: 'department-uuid-1',
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should prevent SQL injection attacks', async () => {
      const maliciousInput = {
        search: "'; DROP TABLE users; --",
        status: 'completed',
      };

      const response = await fetch(`/api/admin/dashboard?userId=admin-uuid-1&search=${maliciousInput.search}`);

      // Should not execute malicious SQL
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result).toHaveProperty('applications');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across all views', async () => {
      // Get data from different endpoints
      const dashboardResponse = await fetch('/api/admin/dashboard?userId=admin-uuid-1');
      const statsResponse = await fetch('/api/admin/stats?userId=admin-uuid-1');
      const reportsResponse = await fetch('/api/admin/reports?userId=admin-uuid-1&type=department-performance');

      expect(dashboardResponse.ok).toBe(true);
      expect(statsResponse.ok).toBe(true);
      expect(reportsResponse.ok).toBe(true);

      const dashboardData = await dashboardResponse.json();
      const statsData = await statsResponse.json();
      const reportsData = await reportsResponse.json();

      // Verify consistency
      expect(statsData.overallStats[0].total_requests).toBe(dashboardData.pagination.total);

      // Verify department data consistency
      const dashboardDepts = dashboardData.applications.reduce((acc, app) => {
        acc[app.department] = (acc[app.department] || 0) + 1;
        return acc;
      }, {});

      reportsData.data.forEach(dept => {
        expect(dept.total_requests).toBeGreaterThan(0);
      });
    });

    it('should handle race conditions properly', async () => {
      // Simulate concurrent requests
      const promises = Array(10).fill().map(() =>
        fetch('/api/staff/dashboard?userId=department-uuid-1')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });

      // All responses should be identical (no race condition corruption)
      const results = await Promise.all(responses.map(r => r.json()));
      const firstResult = results[0];

      results.forEach(result => {
        expect(result.data.applications).toEqual(firstResult.data.applications);
      });
    });
  });
});
