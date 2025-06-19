import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddMemberDialog from '../components/AddMemberDialog';
import { AuthProvider } from '../contexts/AuthContext';

// Mock axios
vi.mock('../src/utils/axios', () => ({
  default: {
    get: vi.fn()
  }
}));

// Mock AuthContext
const mockAuthContext = {
  user: {
    id: 1,
    role: 'ADMIN',
    email: 'admin@test.com',
    managedCompanyId: 1
  }
};

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={mockAuthContext}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

// テスト用のモックデータ
const mockUsers = [
  {
    id: 1,
    firstName: '管理',
    lastName: '太郎',
    email: 'admin@test.com',
    role: 'ADMIN',
    position: '管理者',
    company: { name: 'テスト会社' },
    skills: []
  },
  {
    id: 2,
    firstName: 'マネージャー',
    lastName: '太郎',
    email: 'manager@test.com',
    role: 'MANAGER',
    position: 'プロジェクトマネージャー',
    company: { name: 'テスト会社' },
    skills: []
  },
  {
    id: 3,
    firstName: 'メンバー',
    lastName: '太郎',
    email: 'member@test.com',
    role: 'MEMBER',
    position: '開発者',
    company: { name: 'テスト会社' },
    skills: []
  },
  {
    id: 4,
    firstName: '会社',
    lastName: '管理者',
    email: 'company@test.com',
    role: 'COMPANY',
    position: '会社管理者',
    company: { name: 'テスト会社' },
    skills: []
  }
];

const mockProject = {
  id: 1,
  name: 'テストプロジェクト',
  members: [],
  managers: []
};

describe('AddMemberDialog', () => {
  let mockAxios;

  beforeEach(() => {
    // axios mockをリセット
    mockAxios = require('../utils/axios').default;
    mockAxios.get.mockClear();
    
    // デフォルトのAPI応答を設定
    mockAxios.get.mockImplementation((url) => {
      if (url === '/users') {
        return Promise.resolve({
          data: {
            data: {
              users: mockUsers
            }
          }
        });
      }
      if (url === '/skills/company') {
        return Promise.resolve({
          data: {
            status: 'success',
            data: {
              skills: []
            }
          }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('should filter users by manager roles', async () => {
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <TestWrapper>
        <AddMemberDialog
          open={true}
          onClose={mockOnClose}
          project={mockProject}
          onSubmit={mockOnSubmit}
          roleFilter={['COMPANY', 'MANAGER']}
          title="マネージャーを選択"
        />
      </TestWrapper>
    );

    // ダイアログが表示されることを確認
    expect(screen.getByText('マネージャーを選択')).toBeInTheDocument();

    // API呼び出しが完了するまで待機
    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalledWith('/users', expect.any(Object));
    });

    // フィルタリングされたユーザーが表示されることを確認
    await waitFor(() => {
      // MANAGERロールのユーザーが表示される
      expect(screen.getByText('マネージャー 太郎')).toBeInTheDocument();
      // COMPANYロールのユーザーが表示される
      expect(screen.getByText('会社 管理者')).toBeInTheDocument();
      // MEMBERロールのユーザーは表示されない
      expect(screen.queryByText('メンバー 太郎')).not.toBeInTheDocument();
    });
  });

  it('should filter users by member roles', async () => {
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <TestWrapper>
        <AddMemberDialog
          open={true}
          onClose={mockOnClose}
          project={mockProject}
          onSubmit={mockOnSubmit}
          roleFilter={['MEMBER']}
          title="メンバーを選択"
        />
      </TestWrapper>
    );

    // API呼び出しが完了するまで待機
    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalledWith('/users', expect.any(Object));
    });

    // MEMBERロールのユーザーのみが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('メンバー 太郎')).toBeInTheDocument();
      expect(screen.queryByText('マネージャー 太郎')).not.toBeInTheDocument();
      expect(screen.queryByText('会社 管理者')).not.toBeInTheDocument();
    });
  });

  it('should show all users when no role filter is applied', async () => {
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <TestWrapper>
        <AddMemberDialog
          open={true}
          onClose={mockOnClose}
          project={mockProject}
          onSubmit={mockOnSubmit}
          roleFilter={null}
          title="全メンバーを選択"
        />
      </TestWrapper>
    );

    // API呼び出しが完了するまで待機
    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalledWith('/users', expect.any(Object));
    });

    // 全てのユーザーが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('管理 太郎')).toBeInTheDocument();
      expect(screen.getByText('マネージャー 太郎')).toBeInTheDocument();
      expect(screen.getByText('メンバー 太郎')).toBeInTheDocument();
      expect(screen.getByText('会社 管理者')).toBeInTheDocument();
    });
  });

  it('should allow user selection and submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <TestWrapper>
        <AddMemberDialog
          open={true}
          onClose={mockOnClose}
          project={mockProject}
          onSubmit={mockOnSubmit}
          roleFilter={['MANAGER']}
          title="マネージャーを選択"
        />
      </TestWrapper>
    );

    // API呼び出しが完了するまで待機
    await waitFor(() => {
      expect(screen.getByText('マネージャー 太郎')).toBeInTheDocument();
    });

    // マネージャーを選択
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(checkbox).toBeChecked();

    // 追加ボタンをクリック
    const addButton = screen.getByText(/追加 \(1\)/);
    await user.click(addButton);

    // onSubmitが呼び出されることを確認
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 2,
        firstName: 'マネージャー',
        lastName: '太郎',
        role: 'MANAGER'
      })
    ]);
  });

  it('should handle search functionality', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <TestWrapper>
        <AddMemberDialog
          open={true}
          onClose={mockOnClose}
          project={mockProject}
          onSubmit={mockOnSubmit}
          roleFilter={null}
          title="メンバー検索テスト"
        />
      </TestWrapper>
    );

    // 検索入力フィールドを見つける
    const searchInput = screen.getByPlaceholderText('名前、メール、会社名、役職で検索...');
    
    // 検索文字列を入力
    await user.type(searchInput, 'マネージャー');

    // デバウンス待機
    await waitFor(() => {
      expect(searchInput).toHaveValue('マネージャー');
    }, { timeout: 1000 });

    // 検索結果が正しくフィルタリングされることを確認
    await waitFor(() => {
      expect(screen.getByText('マネージャー 太郎')).toBeInTheDocument();
      expect(screen.queryByText('メンバー 太郎')).not.toBeInTheDocument();
    });
  });

  it('should display validation error when no members are selected', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <TestWrapper>
        <AddMemberDialog
          open={true}
          onClose={mockOnClose}
          project={mockProject}
          onSubmit={mockOnSubmit}
          roleFilter={['MANAGER']}
          title="マネージャーを選択"
        />
      </TestWrapper>
    );

    // API呼び出しが完了するまで待機
    await waitFor(() => {
      expect(screen.getByText('マネージャー 太郎')).toBeInTheDocument();
    });

    // メンバーを選択せずに追加ボタンをクリック
    const addButton = screen.getByText(/追加 \(0\)/);
    expect(addButton).toBeDisabled();
  });
});
