import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../contexts/AuthContext';
import EmployeeEditPage from '../EmployeeEditPage';
import api from '../../../utils/axios';

// API モック
jest.mock('../../../utils/axios');
const mockedApi = api;

// useSnackbar モック
jest.mock('../../../hooks/useSnackbar', () => ({
  useSnackbar: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

// usePageSkills モック
jest.mock('../../../hooks/usePageSkills', () => ({
  usePageSkills: () => ({
    companySkills: [],
    defaultSkills: [],
    allSkills: [
      { id: '1', name: 'JavaScript', category: 'プログラミング' },
      { id: '2', name: 'React', category: 'フロントエンド' },
    ],
    skillStats: {},
    isLoading: false,
  }),
}));

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
  userSkills: [
    {
      skillId: '1',
      years: 3,
      companySelectedSkillId: '1'
    }
  ]
};

const createWrapper = (route = '/employees/1/edit') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EmployeeEditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: { data: mockEmployee } });
  });

  test('社員編集ページが正しく表示される', async () => {
    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('社員を編集: 田中 太郎')).toBeInTheDocument();
    });

    expect(screen.getByText('社員の基本情報とスキル情報を編集してください。')).toBeInTheDocument();
    expect(screen.getByText('社員管理に戻る')).toBeInTheDocument();
  });

  test('パンくずリストが正しく表示される', async () => {
    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('社員管理')).toBeInTheDocument();
      expect(screen.getByText('田中 太郎 の編集')).toBeInTheDocument();
    });
  });

  test('既存の社員データが正しくフォームに設定される', async () => {
    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByDisplayValue('田中')).toBeInTheDocument();
      expect(screen.getByDisplayValue('太郎')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('開発者')).toBeInTheDocument();
    });
  });

  test('フォーム更新が正常に動作する', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { ...mockEmployee, firstName: '次郎' } });

    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByDisplayValue('太郎')).toBeInTheDocument();
    });

    // 名前を変更
    const firstNameInput = screen.getByDisplayValue('太郎');
    fireEvent.change(firstNameInput, { target: { value: '次郎' } });

    // 更新ボタンをクリック
    fireEvent.click(screen.getByText('更新'));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/users/1', expect.objectContaining({
        firstName: '次郎',
        lastName: '田中',
        email: 'test@example.com',
        role: 'MEMBER',
      }));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/employees');
    });
  });

  test('ローディング状態が正しく表示される', () => {
    mockedApi.get.mockImplementation(() => new Promise(() => {})); // 永続的にペンディング

    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  test('エラー状態が正しく表示される', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('データの取得に失敗しました'));

    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('エラー')).toBeInTheDocument();
      expect(screen.getByText('社員情報の読み込みに失敗しました。')).toBeInTheDocument();
    });
  });

  test('戻るボタンが正常に動作する', async () => {
    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('社員管理に戻る')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('社員管理に戻る'));
    expect(mockNavigate).toHaveBeenCalledWith('/employees');
  });

  test('キャンセルボタンが正常に動作する', async () => {
    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('キャンセル'));
    expect(mockNavigate).toHaveBeenCalledWith('/employees');
  });

  test('選択済みスキルが正しく表示される', async () => {
    render(<EmployeeEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('選択済みスキル')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });
  });
});
