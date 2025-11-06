import { rest } from 'msw';
import { server } from '../mocks/server';
import { mockStats, mockForms, mockUsers } from '../__mocks__/mockData';

describe('Admin APIs', () => {
  describe('GET /api/admin/dashboard', () => {
    it('should return all applications for admin', async () => {
      const response = await fetch('/api/admin/dashboard?userId=admin-uuid-1&page=1&limit=20');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('applications');
      expect(Array.isArray(result.applications)).toBe(true);
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');
    });

    it('should handle pagination correctly', async () => {
      const response = await fetch('/api/admin/dashboard?userId=admin-uuid-1&page=2&limit=10');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 2);
      expect(result.pagination).toHaveProperty('limit', 10);
    });

    it('should filter by status correctly', async () => {
      const response = await fetch('/api/admin/dashboard?userId=admin-uuid-1&status=completed');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.applications.forEach(app => {
        expect(app.status).toBe('completed');
      });
    });

    it('should search across all fields', async () => {
      const response = await fetch('/api/admin/dashboard?userId=admin-uuid-1&search=2021A');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.applications.forEach(app => {
        const searchFields = [
          app.student_name,
          app.registration_no,
          app.course,
          app.branch,
        ].join(' ').toLowerCase();
        expect(searchFields).toContain('2021a');
      });
    });

    it('should enforce admin-only access', async () => {
      const response = await fetch('/api/admin/dashboard?userId=student-uuid-1');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return comprehensive statistics', async () => {
      const response = await fetch('/api/admin/stats?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('overallStats');
      expect(result).toHaveProperty('departmentStats');
      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('pendingAlerts');

      expect(Array.isArray(result.overallStats)).toBe(true);
      expect(Array.isArray(result.departmentStats)).toBe(true);
    });

    it('should include department performance metrics', async () => {
      const response = await fetch('/api/admin/stats?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.departmentStats.forEach(dept => {
        expect(dept).toHaveProperty('department_name');
        expect(dept).toHaveProperty('total_requests');
        expect(dept).toHaveProperty('approved_requests');
        expect(dept).toHaveProperty('rejected_requests');
        expect(dept).toHaveProperty('pending_requests');
        expect(dept).toHaveProperty('avg_response_time');
        expect(dept).toHaveProperty('approval_rate');
        expect(dept).toHaveProperty('rejection_rate');
      });
    });

    it('should calculate response times correctly', async () => {
      const response = await fetch('/api/admin/stats?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      result.departmentStats.forEach(dept => {
        expect(dept.avg_response_time).toMatch(/^\d+[hms ]*$/);
      });
    });

    it('should include recent activity', async () => {
      const response = await fetch('/api/admin/stats?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(Array.isArray(result.recentActivity)).toBe(true);

      if (result.recentActivity.length > 0) {
        result.recentActivity.forEach(activity => {
          expect(activity).toHaveProperty('student_name');
          expect(activity).toHaveProperty('department_name');
          expect(activity).toHaveProperty('status');
          expect(activity).toHaveProperty('action_at');
        });
      }
    });

    it('should include pending alerts', async () => {
      const response = await fetch('/api/admin/stats?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(Array.isArray(result.pendingAlerts)).toBe(true);

      if (result.pendingAlerts.length > 0) {
        result.pendingAlerts.forEach(alert => {
          expect(alert).toHaveProperty('department_name');
          expect(alert).toHaveProperty('status', 'pending');
        });
      }
    });

    it('should enforce admin-only access', async () => {
      const response = await fetch('/api/admin/stats?userId=student-uuid-1');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/reports', () => {
    describe('department-performance report', () => {
      it('should return department performance data', async () => {
        const response = await fetch('/api/admin/reports?userId=admin-uuid-1&type=department-performance');

        expect(response.ok).toBe(true);
        const result = await response.json();

        expect(result).toHaveProperty('reportType', 'department-performance');
        expect(result).toHaveProperty('data');
        expect(Array.isArray(result.data)).toBe(true);

        result.data.forEach(dept => {
          expect(dept).toHaveProperty('department_name');
          expect(dept).toHaveProperty('approved');
          expect(dept).toHaveProperty('rejected');
          expect(dept).toHaveProperty('pending');
        });
      });
    });

    describe('requests-over-time report', () => {
      it('should return requests grouped by date', async () => {
        const response = await fetch('/api/admin/reports?userId=admin-uuid-1&type=requests-over-time');

        expect(response.ok).toBe(true);
        const result = await response.json();

        expect(result).toHaveProperty('reportType', 'requests-over-time');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('dates');
        expect(result.data).toHaveProperty('data');

        expect(Array.isArray(result.data.dates)).toBe(true);
      });

      it('should handle date range parameters', async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-01-31';

        const response = await fetch(
          `/api/admin/reports?userId=admin-uuid-1&type=requests-over-time&startDate=${startDate}&endDate=${endDate}`
        );

        expect(response.ok).toBe(true);
        const result = await response.json();

        expect(result).toHaveProperty('startDate', startDate);
        expect(result).toHaveProperty('endDate', endDate);
      });
    });

    describe('pending-analysis report', () => {
      it('should return detailed pending request analysis', async () => {
        const response = await fetch('/api/admin/reports?userId=admin-uuid-1&type=pending-analysis');

        expect(response.ok).toBe(true);
        const result = await response.json();

        expect(result).toHaveProperty('reportType', 'pending-analysis');
        expect(Array.isArray(result.data)).toBe(true);

        result.data.forEach(item => {
          expect(item).toHaveProperty('department_name');
          expect(item).toHaveProperty('status', 'pending');
          expect(item).toHaveProperty('no_dues_forms');
          expect(item.no_dues_forms).toHaveProperty('student_name');
          expect(item.no_dues_forms).toHaveProperty('registration_no');
        });
      });

      it('should order by oldest pending requests first', async () => {
        const response = await fetch('/api/admin/reports?userId=admin-uuid-1&type=pending-analysis');

        expect(response.ok).toBe(true);
        const result = await response.json();

        if (result.data.length > 1) {
          for (let i = 1; i < result.data.length; i++) {
            const prevDate = new Date(result.data[i - 1].created_at);
            const currentDate = new Date(result.data[i].created_at);
            expect(prevDate.getTime()).toBeLessThanOrEqual(currentDate.getTime());
          }
        }
      });
    });

    it('should handle invalid report types', async () => {
      const response = await fetch('/api/admin/reports?userId=admin-uuid-1&type=invalid-type');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error', 'Invalid report type');
    });

    it('should enforce admin-only access', async () => {
      const response = await fetch('/api/admin/reports?userId=student-uuid-1&type=department-performance');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('User Management', () => {
    it('should allow admin to view all users', async () => {
      const response = await fetch('/api/admin/users?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(Array.isArray(result.users)).toBe(true);
      expect(result).toHaveProperty('pagination');
    });

    it('should allow admin to update user profiles', async () => {
      const updateData = {
        userId: 'student-uuid-1',
        updates: {
          full_name: 'Updated Student Name',
          department_name: 'LIBRARY',
        },
      };

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('System Monitoring', () => {
    it('should track system performance metrics', async () => {
      const response = await fetch('/api/admin/stats?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('overallStats');
      const stats = result.overallStats[0];
      expect(stats).toHaveProperty('total_requests');
      expect(stats).toHaveProperty('avg_hours_per_request');
      expect(stats).toHaveProperty('total_students');
      expect(stats).toHaveProperty('total_departments');
    });

    it('should identify system bottlenecks', async () => {
      const response = await fetch('/api/admin/reports?userId=admin-uuid-1&type=pending-analysis');

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Should identify departments with oldest pending requests
      result.data.forEach(item => {
        expect(item).toHaveProperty('created_at');
        expect(new Date(item.created_at)).toBeInstanceOf(Date);
      });
    });
  });

  describe('Data Export and Reporting', () => {
    it('should support CSV export functionality', async () => {
      const response = await fetch('/api/admin/reports?userId=admin-uuid-1&type=department-performance&format=csv');

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/csv');
    });

    it('should support PDF report generation', async () => {
      const response = await fetch('/api/admin/reports?userId=admin-uuid-1&type=department-performance&format=pdf');

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('application/pdf');
    });
  });
});
