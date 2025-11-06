import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'next/router';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

// Custom render function with providers
export const customRender = (ui, options = {}) => {
  const { user = userEvent.setup(), ...renderOptions } = options;

  const AllTheProviders = ({ children }) => {
    return (
      <BrowserRouter>
        <SessionContextProvider
          supabaseClient={null}
          initialSession={null}
        >
          {children}
        </SessionContextProvider>
      </BrowserRouter>
    );
  };

  return {
    user,
    ...render(ui, { wrapper: AllTheProviders, ...renderOptions }),
  };
};

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
};

// Test data builders
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'student',
  ...overrides,
});

export const createMockForm = (overrides = {}) => ({
  id: 'test-form-id',
  user_id: 'test-user-id',
  student_name: 'Test Student',
  registration_no: '2021A1234',
  status: 'pending',
  ...overrides,
});

export const createMockStatus = (overrides = {}) => ({
  id: 'test-status-id',
  form_id: 'test-form-id',
  department_name: 'LIBRARY',
  status: 'pending',
  ...overrides,
});

// Wait for async operations
export const waitForLoadingToFinish = () =>
  waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

// Common test assertions
export const expectApiCall = (url, method = 'GET', body = null) => {
  // This would be used in actual API testing
  return { url, method, body };
};

export const expectElementWithText = (text) => {
  return screen.getByText(text);
};

export const expectElementWithRole = (role, name) => {
  return screen.getByRole(role, { name });
};

export const fillFormField = (label, value) => {
  const field = screen.getByLabelText(label);
  fireEvent.change(field, { target: { value } });
  return field;
};

export const clickButton = (name) => {
  const button = screen.getByRole('button', { name });
  fireEvent.click(button);
  return button;
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store = {};

  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Mock window methods
export const mockWindowMethods = () => {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      reload: jest.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, 'print', {
    value: jest.fn(),
    writable: true,
  });
};
