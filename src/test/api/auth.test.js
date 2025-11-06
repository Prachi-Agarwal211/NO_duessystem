import { rest } from 'msw';
import { server } from '../mocks/server';
import { mockUsers, mockAuthResponse } from '../__mocks__/mockData';

describe('Authentication API', () => {
  describe('POST /api/auth/signup', () => {
    it('should successfully create a new student account', async () => {
      const signupData = {
        email: 'newstudent@test.com',
        password: 'password123',
        fullName: 'New Student',
        registrationNo: '2022A5678',
        role: 'student',
      };

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('message', 'User registered successfully');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('email', signupData.email);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'test@test.com',
        password: 'password123',
        // Missing fullName and registrationNo for student
      };

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      server.use(
        rest.post('/api/auth/signup', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Database connection failed' }));
        })
      );

      const signupData = {
        email: 'test@test.com',
        password: 'password123',
        fullName: 'Test User',
        registrationNo: '2021A1234',
        role: 'student',
      };

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('User Profile Management', () => {
    it('should retrieve user profile correctly', async () => {
      const response = await fetch('/api/auth/profile?userId=student-uuid-1');

      expect(response.ok).toBe(true);
      const profile = await response.json();

      expect(profile).toHaveProperty('id', 'student-uuid-1');
      expect(profile).toHaveProperty('role', 'student');
      expect(profile).toHaveProperty('registration_no', '2021A1234');
    });

    it('should handle non-existent user', async () => {
      const response = await fetch('/api/auth/profile?userId=non-existent');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('Role-based Access Control', () => {
    it('should enforce role restrictions on protected endpoints', async () => {
      const response = await fetch('/api/admin/dashboard?userId=student-uuid-1');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should allow admin access to all endpoints', async () => {
      const response = await fetch('/api/admin/dashboard?userId=admin-uuid-1');

      expect(response.ok).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should validate active sessions', async () => {
      const response = await fetch('/api/auth/session');

      expect(response.ok).toBe(true);
    });

    it('should handle expired sessions', async () => {
      // Mock expired session
      server.use(
        rest.get('/api/auth/session', (req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ error: 'Session expired' }));
        })
      );

      const response = await fetch('/api/auth/session');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
});
