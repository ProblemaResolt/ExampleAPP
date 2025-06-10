import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axios';

// Mock the API
vi.mock('../../utils/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component to check auth state
const TestComponent = () => {
  const { user, isAuthenticated, login, logout, fetchUser } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-data">
        {user ? JSON.stringify(user) : 'no-user'}
      </div>
      <button 
        data-testid="login-btn" 
        onClick={() => login('test@example.com', 'password')}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="fetch-user-btn" onClick={fetchUser}>
        Fetch User
      </button>
    </div>
  );
};

const renderWithProviders = (children) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AuthContext Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should only store token in localStorage, not user data', async () => {
    const mockLoginResponse = {
      data: {
        status: 'success',
        data: {
          token: 'test-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'COMPANY'
          }
        }
      }
    };

    api.post.mockResolvedValueOnce(mockLoginResponse);

    renderWithProviders(<TestComponent />);

    const loginBtn = screen.getByTestId('login-btn');
    loginBtn.click();

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-jwt-token');
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith('user', expect.anything());
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith('userData', expect.anything());
    });
  });

  it('should authenticate with token only, without user data', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'existing-token';
      return null;
    });

    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-data')).toHaveTextContent('no-user');
  });

  it('should fetch user data dynamically', async () => {
    const mockUserResponse = {
      data: {
        status: 'success',
        data: {
          user: {
            id: 1,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'COMPANY',
            managedCompanyId: null,
            managedCompanyName: null
          }
        }
      }
    };

    api.get.mockResolvedValueOnce(mockUserResponse);

    renderWithProviders(<TestComponent />);

    const fetchUserBtn = screen.getByTestId('fetch-user-btn');
    fetchUserBtn.click();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/me');
      expect(screen.getByTestId('user-data')).toHaveTextContent('"email":"test@example.com"');
    });
  });

  it('should logout and clear token', async () => {
    localStorageMock.getItem.mockReturnValue('existing-token');

    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');

    const logoutBtn = screen.getByTestId('logout-btn');
    logoutBtn.click();

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user-data')).toHaveTextContent('no-user');
    });
  });

  it('should handle API errors gracefully', async () => {
    api.get.mockRejectedValueOnce(new Error('API Error'));

    renderWithProviders(<TestComponent />);

    const fetchUserBtn = screen.getByTestId('fetch-user-btn');
    fetchUserBtn.click();

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    });
  });
});
