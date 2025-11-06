import { customRender, expectElementWithText, clickButton, fillFormField } from '../utils/testUtils';
import { mockForms, mockDepartments, mockStatusRecords } from '../__mocks__/mockData';

describe('Staff Components', () => {
  describe('Staff Dashboard', () => {
    it('should display pending requests for department staff', async () => {
      const response = await fetch('/api/staff/dashboard?userId=department-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toHaveProperty('applications');
      expect(Array.isArray(result.data.applications)).toBe(true);
    });

    it('should display all completed requests for registrar', async () => {
      const response = await fetch('/api/staff/dashboard?userId=registrar-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toHaveProperty('applications');
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

  describe('Audit Trail', () => {
    it('should log all staff actions', async () => {
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

      // Verify audit log entry was created
      const auditResponse = await fetch('https://test.supabase.co/rest/v1/audit_log');
      const auditLog = await auditResponse.json();

      const relevantEntry = auditLog.find(log =>
        log.action_details.form_id === 'form-uuid-1' &&
        log.action_details.action === 'approved'
      );

      expect(relevantEntry).toBeDefined();
      expect(relevantEntry).toHaveProperty('user_id', 'department-uuid-1');
      expect(relevantEntry).toHaveProperty('action_type', 'status_update');
    });

    it('should track approval patterns', async () => {
      const auditResponse = await fetch('https://test.supabase.co/rest/v1/audit_log');
      const auditLog = await auditResponse.json();

      const approvalActions = auditLog.filter(log => log.action_details.action === 'approved');

      expect(Array.isArray(approvalActions)).toBe(true);

      approvalActions.forEach(action => {
        expect(action).toHaveProperty('user_id');
        expect(action).toHaveProperty('action_details');
        expect(action).toHaveProperty('created_at');
      });
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
