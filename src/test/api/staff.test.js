import { rest } from 'msw';
import { server } from '../mocks/server';
import { mockForms, mockStatusRecords, mockDepartments } from '../__mocks__/mockData';

describe('Staff APIs', () => {
  describe('GET /api/staff/dashboard', () => {
    it('should return pending requests for department staff', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('applications');
      expect(Array.isArray(result.data.applications)).toBe(true);
    });

    it('should return completed requests for registrar', async () => {
      const response = await fetch('/api/staff/dashboard?userId=registrar-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('applications');
    });

    it('should handle pagination correctly', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&page=1&limit=10');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('pagination');
      expect(result.data.pagination).toHaveProperty('total');
      expect(result.data.pagination).toHaveProperty('totalPages');
    });

    it('should filter by status correctly', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&status=pending');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('success', true);
      // Verify only pending requests are returned
      result.data.applications.forEach(app => {
        expect(app.status).toBe('pending');
      });
    });

    it('should enforce role-based access control', async () => {
      const response = await fetch('/api/staff/dashboard?userId=student-uuid-1');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/staff/action', () => {
    it('should successfully approve a request', async () => {
      const actionData = {
        formId: 'form-uuid-1',
        departmentName: 'LIBRARY',
        action: 'approve',
        userId: 'department-uuid-1',
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('message');
      expect(result.data.status).toHaveProperty('status', 'approved');
    });

    it('should successfully reject a request with reason', async () => {
      const actionData = {
        formId: 'form-uuid-1',
        departmentName: 'LIBRARY',
        action: 'reject',
        reason: 'Outstanding library dues',
        userId: 'department-uuid-1',
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('success', true);
      expect(result.data.status).toHaveProperty('status', 'rejected');
      expect(result.data.status).toHaveProperty('rejection_reason', 'Outstanding library dues');
    });

    it('should require rejection reason when rejecting', async () => {
      const actionData = {
        formId: 'form-uuid-1',
        departmentName: 'LIBRARY',
        action: 'reject',
        userId: 'department-uuid-1',
        // Missing reason
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should update form status when all departments approve', async () => {
      // Mock all departments as approved
      server.use(
        rest.get('https://test.supabase.co/rest/v1/no_dues_status*', (req, res, ctx) => {
          return res(ctx.json([
            { ...mockStatusRecords[0], status: 'approved' },
            { ...mockStatusRecords[1], status: 'approved' },
            { ...mockStatusRecords[2], status: 'approved' },
          ]));
        })
      );

      const actionData = {
        formId: 'form-uuid-1',
        departmentName: 'LIBRARY',
        action: 'approve',
        userId: 'department-uuid-1',
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data.form).toHaveProperty('status', 'completed');
    });

    it('should prevent unauthorized department actions', async () => {
      const actionData = {
        formId: 'form-uuid-1',
        departmentName: 'IT_DEPARTMENT', // Different from user's department
        action: 'approve',
        userId: 'department-uuid-1', // Library department user
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });

    it('should handle non-existent forms', async () => {
      const actionData = {
        formId: 'non-existent-form',
        departmentName: 'LIBRARY',
        action: 'approve',
        userId: 'department-uuid-1',
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/staff/student/:id', () => {
    it('should return complete student details for department staff', async () => {
      const response = await fetch('/api/staff/student/form-uuid-1?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('form');
      expect(result.data).toHaveProperty('departmentStatuses');

      expect(result.data.form).toHaveProperty('student_name');
      expect(result.data.form).toHaveProperty('registration_no');

      expect(Array.isArray(result.data.departmentStatuses)).toBe(true);
      expect(result.data.departmentStatuses).toHaveLength(mockDepartments.length);
    });

    it('should include all department statuses', async () => {
      const response = await fetch('/api/staff/student/form-uuid-1?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      const departments = result.data.departmentStatuses;
      const expectedDepartments = ['LIBRARY', 'IT_DEPARTMENT', 'HOSTEL', 'REGISTRAR'];

      expectedDepartments.forEach(deptName => {
        const deptStatus = departments.find(d => d.department_name === deptName);
        expect(deptStatus).toBeDefined();
        expect(deptStatus).toHaveProperty('display_name');
        expect(deptStatus).toHaveProperty('status');
      });
    });

    it('should enforce access control', async () => {
      const response = await fetch('/api/staff/student/form-uuid-1?userId=student-uuid-1');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should handle non-existent student', async () => {
      const response = await fetch('/api/staff/student/non-existent?userId=department-uuid-1');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('Search and Filter Functionality', () => {
    it('should search by student name', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&search=Test');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.applications.forEach(app => {
        expect(app.student_name.toLowerCase()).toContain('test');
      });
    });

    it('should search by registration number', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&search=2021A');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.applications.forEach(app => {
        expect(app.registration_no).toContain('2021A');
      });
    });

    it('should filter by status', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&status=pending');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.applications.forEach(app => {
        expect(app.status).toBe('pending');
      });
    });
  });
});
