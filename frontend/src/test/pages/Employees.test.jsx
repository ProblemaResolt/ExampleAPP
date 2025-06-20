import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import Employees from '../Employees';
import api from '../../utils/axios';

// API モック
jest.mock('../../utils/axios');
const mockedApi = api;

// useSnackbar モック
jest.mock('../../hooks/useSnackbar', () => ({
  useSnackbar: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

// モックルーター
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockEmployeesData = {
  users: [
    {
      id: '1',
      firstName: '太郎',
      lastName: '田中',
      email: 'tanaka@example.com',
      role: 'MEMBER',
      position: '開発者',
      isActive: true,
      userSkills: [
        {
          companySelectedSkill: {
            globalSkill: {
              name: 'JavaScript',
              category: 'プログラミング'
            }
          },
          years: 3
        }
      ]
    },
    {
      id: '2',
      firstName: '花子',
      lastName: '佐藤',
      email: 'sato@example.com',
      role: 'MANAGER',
      position: 'マネージャー',
      isActive: false,
      userSkills: []
    }
  ],
  pagination: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1
  }
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Employees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: mockEmployeesData });
  });

  test('社員管理ページが正しく表示される', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    expect(screen.getByText('社員管理')).toBeInTheDocument();
    expect(screen.getByText('社員を追加')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
    });
  });

  test('社員を追加ボタンが正常に動作する', () => {
    render(<Employees />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('社員を追加'));
    expect(mockNavigate).toHaveBeenCalledWith('/employees/create');
  });

  test('詳細ボタンが正常に動作する', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('詳細')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('詳細')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/employees/1');
  });

  test('編集ボタンが正常に動作する', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTitle('編集')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByTitle('編集')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/employees/1/edit');
  });

  test('削除ボタンが正常に動作する', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} });

    render(<Employees />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTitle('削除')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByTitle('削除')[0]);

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith('/users/1');
    });
  });

  test('検索機能が正常に動作する', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText('社員を検索...');
    fireEvent.change(searchInput, { target: { value: '田中' } });

    // デバウンス処理のため少し待つ
    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/users', expect.objectContaining({
        params: expect.objectContaining({
          search: '田中'
        })
      }));
    }, { timeout: 1000 });
  });

  test('ロールフィルターが正常に動作する', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    const roleSelect = screen.getByDisplayValue('すべてのロール');
    fireEvent.change(roleSelect, { target: { value: 'MANAGER' } });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/users', expect.objectContaining({
        params: expect.objectContaining({
          role: 'MANAGER'
        })
      }));
    });
  });

  test('ステータスフィルターが正常に動作する', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    const statusSelect = screen.getByDisplayValue('すべてのステータス');
    fireEvent.change(statusSelect, { target: { value: 'true' } });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/users', expect.objectContaining({
        params: expect.objectContaining({
          status: 'true'
        })
      }));
    });
  });

  test('ソート機能が正常に動作する', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('名前')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('名前'));

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/users', expect.objectContaining({
        params: expect.objectContaining({
          sort: 'firstName:asc'
        })
      }));
    });
  });

  test('ページネーション機能が正常に動作する', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });

    // ページサイズ変更
    const pageSizeSelect = screen.getByDisplayValue('10件表示');
    fireEvent.change(pageSizeSelect, { target: { value: '25' } });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/users', expect.objectContaining({
        params: expect.objectContaining({
          limit: 25,
          page: 1
        })
      }));
    });
  });

  test('ローディング状態が正しく表示される', () => {
    mockedApi.get.mockImplementation(() => new Promise(() => {})); // 永続的にペンディング

    render(<Employees />, { wrapper: createWrapper() });

    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // spinner
  });

  test('社員がいない場合の表示', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        users: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
      }
    });

    render(<Employees />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('社員はありません')).toBeInTheDocument();
    });
  });

  test('社員のロールと状態が正しく表示される', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('メンバー')).toBeInTheDocument();
      expect(screen.getByText('マネージャー')).toBeInTheDocument();
      expect(screen.getByText('有効')).toBeInTheDocument();
      expect(screen.getByText('無効')).toBeInTheDocument();
    });
  });

  test('社員のスキル情報が正しく表示される', async () => {
    render(<Employees />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('JavaScript（3年）')).toBeInTheDocument();
    });
  });
});
