import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../contexts/AuthContext';
import EmployeeDetailPage from '../EmployeeDetailPage';
import api from '../../../utils/axios';

// API モック
jest.mock('../../../utils/axios');
const mockedApi = api;

// モックルーター
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

const mockEmployee = {
  id: '1',
  firstName: '太郎',
  lastName: '田中',
  email: 'test@example.com',
  role: 'MEMBER',
  position: '開発者',
  phone: '090-1234-5678',
  prefecture: '東京都',
  city: '渋谷区',
  streetAddress: '1-1-1',
  isActive: true,
  isEmailVerified: true,
  createdAt: '2023-01-01T00:00:00Z',
  lastLoginAt: '2023-12-01T00:00:00Z',
  userSkills: [
    {
      skillId: '1',
      years: 3,
      companySelectedSkill: {
        globalSkill: {
          name: 'JavaScript',
          category: 'プログラミング'
        }
      }
    },
    {
      skillId: '2',
      years: 2,
      companySelectedSkill: {
        globalSkill: {
          name: 'React',
          category: 'フロントエンド'
        }
      }
    }
  ],
  projectMemberships: [
    {
      project: { name: 'プロジェクトA' },
      isManager: false,
      allocation: 50,
      startDate: '2023-01-01',
      endDate: '2023-12-31'
    },
    {
      project: { name: 'プロジェクトB' },
      isManager: true,
      allocation: 30,
      startDate: '2023-06-01',
      endDate: null
    }
  ]
};

const createWrapper = (userRole = 'COMPANY') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  // AuthContextのモックユーザー
  const mockUser = { role: userRole };

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/employees/1']}>
        <AuthProvider value={{ user: mockUser }}>
          {children}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EmployeeDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: { data: mockEmployee } });
  });

  test('従業員詳細ページが正しく表示される', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('従業員詳細情報: 田中 太郎')).toBeInTheDocument();
    });

    expect(screen.getByText('社員の詳細情報を確認できます。')).toBeInTheDocument();
  });

  test('パンくずリストが正しく表示される', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('社員管理')).toBeInTheDocument();
      expect(screen.getByText('田中 太郎 の詳細')).toBeInTheDocument();
    });
  });

  test('基本情報が正しく表示される', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('090-1234-5678')).toBeInTheDocument();
      expect(screen.getByText('東京都渋谷区1-1-1')).toBeInTheDocument();
      expect(screen.getByText('開発者')).toBeInTheDocument();
      expect(screen.getByText('メンバー')).toBeInTheDocument();
      expect(screen.getByText('有効')).toBeInTheDocument();
      expect(screen.getByText('認証済み')).toBeInTheDocument();
    });
  });

  test('アカウント情報が正しく表示される', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('アカウント情報')).toBeInTheDocument();
      expect(screen.getByText('2023/1/1')).toBeInTheDocument(); // 作成日
      expect(screen.getByText('2023/12/1 9:00:00')).toBeInTheDocument(); // 最終ログイン
    });
  });

  test('スキル情報が正しく表示される', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('スキル情報')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('経験年数: 3 年')).toBeInTheDocument();
      expect(screen.getByText('経験年数: 2 年')).toBeInTheDocument();
    });
  });

  test('プロジェクト参加情報が正しく表示される', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('参加プロジェクト')).toBeInTheDocument();
      expect(screen.getByText('プロジェクトA')).toBeInTheDocument();
      expect(screen.getByText('プロジェクトB')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('マネージャー')).toBeInTheDocument();
      expect(screen.getByText('メンバー')).toBeInTheDocument();
    });
  });

  test('COMPANY権限ユーザーには編集ボタンが表示される', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper('COMPANY') });

    await waitFor(() => {
      expect(screen.getByText('編集')).toBeInTheDocument();
    });
  });

  test('ADMIN権限ユーザーには編集ボタンが表示される', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper('ADMIN') });

    await waitFor(() => {
      expect(screen.getByText('編集')).toBeInTheDocument();
    });
  });

  test('MEMBER権限ユーザーには編集ボタンが表示されない', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper('MEMBER') });

    await waitFor(() => {
      expect(screen.getByText('社員管理に戻る')).toBeInTheDocument();
    });

    expect(screen.queryByText('編集')).not.toBeInTheDocument();
  });

  test('戻るボタンが正常に動作する', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('社員管理に戻る')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('社員管理に戻る'));
    expect(mockNavigate).toHaveBeenCalledWith('/employees');
  });

  test('編集ボタンが正常に動作する', async () => {
    render(<EmployeeDetailPage />, { wrapper: createWrapper('COMPANY') });

    await waitFor(() => {
      expect(screen.getByText('編集')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('編集'));
    expect(mockNavigate).toHaveBeenCalledWith('/employees/1/edit');
  });

  test('ローディング状態が正しく表示される', () => {
    mockedApi.get.mockImplementation(() => new Promise(() => {})); // 永続的にペンディング

    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  test('エラー状態が正しく表示される', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('データの取得に失敗しました'));

    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('エラー')).toBeInTheDocument();
      expect(screen.getByText('社員情報の読み込みに失敗しました。')).toBeInTheDocument();
    });
  });

  test('スキルが登録されていない場合の表示', async () => {
    const employeeWithoutSkills = { ...mockEmployee, userSkills: [] };
    mockedApi.get.mockResolvedValue({ data: { data: employeeWithoutSkills } });

    render(<EmployeeDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('登録されているスキルがありません。')).toBeInTheDocument();
    });
  });
});
