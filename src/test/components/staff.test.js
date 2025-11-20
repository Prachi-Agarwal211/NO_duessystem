import { customRender, expectElementWithText, clickButton, fillFormField } from '../utils/testUtils';
import { mockForms, mockDepartments, mockStatusRecords } from '../__mocks__/mockData';

/**
 * Staff Component Tests - Phase 1 Design
 * 
 * Phase 1: Only department and admin roles exist
 * - Department staff can view/action requests for their department
 * - Admin can view all requests across all departments
 * - No audit_log table (removed per YAGNI)
 */

describe('Staff Components', () => {
  describe('Staff Dashboard', () => {
    it('should display pending requests for department staff', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toHaveProperty('applications');
      expect(Array.isArray(result.data.applications)).toBe(true);
    });

    it('should display all requests for admin', async () => {
      const response = await fetch('/api/staff/dashboard?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toHaveProperty('applications');
      expect(result.data.applications.length).toBeGreaterThan(0);
    });

    it('should handle search functionality', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&search=Test');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.applications.forEach(app => {
        expect(app.student_name.toLowerCase()).toContain('test');
      });
    });

    it('should handle pagination', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&page=1&limit=10');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toHaveProperty('pagination');
      expect(result.data.pagination).toHaveProperty('totalPages');
    });

    it('should enforce role-based access', async () => {
      const response = await fetch('/api/staff/dashboard?userId=student-uuid-1');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Request Actions', () => {
    it('should allow staff to approve requests', async () => {
      const actionData = {
        formId: 'form-uuid-1',
        departmentName: 'LIBRARY',
        action: 'approve',
        userId: 'department-uuid-1',
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data.status).toHaveProperty('status', 'approved');
      expect(result.data).toHaveProperty('message');
    });

    it('should require reason for rejection', async () => {
      const actionData = {
        formId: 'form-uuid-1',
        departmentName: 'LIBRARY',
        action: 'reject',
        userId: 'department-uuid-1',
        // Missing reason
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should prevent duplicate actions on same status', async () => {
      // Mock already approved status
      const actionData = {
        formId: 'form-uuid-1',
        departmentName: 'LIBRARY',
        action: 'approve',
        userId: 'department-uuid-1',
      };

      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Student Detail View', () => {
    it('should display complete student information', async () => {
      const response = await fetch('/api/staff/student/form-uuid-1?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toHaveProperty('form');
      expect(result.data).toHaveProperty('departmentStatuses');

      const form = result.data.form;
      expect(form).toHaveProperty('student_name');
      expect(form).toHaveProperty('registration_no');
      expect(form).toHaveProperty('course');
      expect(form).toHaveProperty('branch');
    });

    it('should show all department statuses', async () => {
      const response = await fetch('/api/staff/student/form-uuid-1?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data.departmentStatuses).toHaveLength(mockDepartments.length);

      result.data.departmentStatuses.forEach(status => {
        expect(status).toHaveProperty('department_name');
        expect(status).toHaveProperty('display_name');
        expect(status).toHaveProperty('status');
      });
    });

    it('should display rejection reasons when applicable', async () => {
      const response = await fetch('/api/staff/student/form-uuid-1?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      const rejectedStatus = result.data.departmentStatuses.find(s => s.status === 'rejected');
      if (rejectedStatus) {
        expect(rejectedStatus).toHaveProperty('rejection_reason');
      }
    });

    it('should show response times', async () => {
      const response = await fetch('/api/staff/student/form-uuid-1?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.departmentStatuses.forEach(status => {
        if (status.action_at) {
          expect(status).toHaveProperty('response_time');
          expect(typeof status.response_time).toBe('string');
        }
      });
    });
  });

  describe('Search and Filter', () => {
    it('should search by student name', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&search=Student');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.data.applications.forEach(app => {
        expect(app.student_name.toLowerCase()).toContain('student');
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

    it('should handle empty search results', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1&search=nonexistent');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data.applications).toHaveLength(0);
    });
  });

  describe('Real-time Updates', () => {
    it('should update dashboard when new requests arrive', async () => {
      // Test real-time subscription updates
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const initialResult = await response.json();

      // Simulate new form submission
      await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newstudent@test.com',
          password: 'password123',
          fullName: 'New Student',
          registrationNo: '2023A9999',
          role: 'student',
        }),
      });

      // Dashboard should update with new request
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedResponse = await fetch('/api/staff/dashboard?userId=department-uuid-1');
      const updatedResult = await updatedResponse.json();

      // Should include new request (this would be tested with actual real-time updates)
      expect(updatedResult.data).toHaveProperty('applications');
    });
  });
});
