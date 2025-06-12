import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// 実際のAPIを使用する結合テスト用コンポーネント
const IntegrationTestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout, fetchUser } = useAuth();
  
  const handleLogin = async () => {
  // 実際に存在するテストユーザーでログイン
    const result = await login('testcompany@example.com', 'testpassword');
  };

  const handleFetchUser = async () => {
    try {
      const userData = await fetchUser();
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  };
  
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="user-email">{user?.email || 'no-email'}</div>
      <div data-testid="user-role">{user?.role || 'no-role'}</div>
      <button data-testid="login" onClick={handleLogin}>
        Login
      </button>
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
      <button data-testid="fetch-user" onClick={handleFetchUser}>
        Fetch User
      </button>
    </div>
  );
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    // localStorageをクリア
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }
  });

  afterEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }
  });

  it('初期状態は非認証状態', () => {
    renderWithRouter(<IntegrationTestComponent />);
    
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('実際のAPIでログインができる', async () => {
    renderWithRouter(<IntegrationTestComponent />);
    
    const loginButton = screen.getByTestId('login');
    fireEvent.click(loginButton);

    // ログイン処理を待つ
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    }, { timeout: 5000 });

    // トークンがlocalStorageに保存されていることを確認
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(localStorage.getItem('token')).toBeTruthy();
    }
  }, 10000);

  it('fetchUser で実際のユーザーデータを取得できる', async () => {
    // 事前にトークンを設定（実際の有効なトークンが必要）
    if (typeof window !== 'undefined' && window.localStorage) {
      // テスト用の有効なトークンを生成する必要がある
      localStorage.setItem('token', 'valid-test-token');
    }

    renderWithRouter(<IntegrationTestComponent />);
    
    const fetchButton = screen.getByTestId('fetch-user');
    fireEvent.click(fetchButton);

    // API呼び出しが完了するまで待つ
    await waitFor(() => {
      const userEmail = screen.getByTestId('user-email').textContent;
      expect(userEmail).not.toBe('no-email');
    }, { timeout: 5000 });
  }, 10000);

  it('ログアウト時にトークンがクリアされる', async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('token', 'test-token');
    }

    renderWithRouter(<IntegrationTestComponent />);
    
    const logoutButton = screen.getByTestId('logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });

    if (typeof window !== 'undefined' && window.localStorage) {
      expect(localStorage.getItem('token')).toBeNull();
    }
  });
});
