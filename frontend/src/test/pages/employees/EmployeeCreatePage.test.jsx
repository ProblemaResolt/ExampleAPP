import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../contexts/AuthContext';
import EmployeeCreatePage from '../EmployeeCreatePage';
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
}));

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

describe('EmployeeCreatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('社員作成ページが正しく表示される', () => {
    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    expect(screen.getByText('社員を追加')).toBeInTheDocument();
    expect(screen.getByText('新しい社員の基本情報とスキル情報を入力してください。')).toBeInTheDocument();
    expect(screen.getByText('社員管理に戻る')).toBeInTheDocument();
  });

  test('パンくずリストが正しく表示される', () => {
    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    expect(screen.getByText('ホーム')).toBeInTheDocument();
    expect(screen.getByText('社員管理')).toBeInTheDocument();
    expect(screen.getByText('社員を追加')).toBeInTheDocument();
  });

  test('メール通知についての説明が表示される', () => {
    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    expect(screen.getByText('📧 メール通知について:')).toBeInTheDocument();
    expect(screen.getByText(/自動生成された安全なログイン情報/)).toBeInTheDocument();
    expect(screen.getByText(/メールアドレス確認リンク/)).toBeInTheDocument();
  });

  test('必須フィールドが正しく表示される', () => {
    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/名前（姓）/)).toBeInTheDocument();
    expect(screen.getByLabelText(/名前（名）/)).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ロール/)).toBeInTheDocument();
  });

  test('フォーム送信が正常に動作する', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: '1', firstName: 'テスト', lastName: '太郎' } });

    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    // フォームに入力
    fireEvent.change(screen.getByLabelText(/名前（姓）/), { target: { value: '田中' } });
    fireEvent.change(screen.getByLabelText(/名前（名）/), { target: { value: '太郎' } });
    fireEvent.change(screen.getByLabelText(/メールアドレス/), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/ロール/), { target: { value: 'MEMBER' } });

    // 送信ボタンをクリック
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/users', expect.objectContaining({
        firstName: '太郎',
        lastName: '田中',
        email: 'test@example.com',
        role: 'MEMBER',
      }));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/employees');
    });
  });

  test('戻るボタンが正常に動作する', () => {
    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('社員管理に戻る'));
    expect(mockNavigate).toHaveBeenCalledWith('/employees');
  });

  test('キャンセルボタンが正常に動作する', () => {
    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('キャンセル'));
    expect(mockNavigate).toHaveBeenCalledWith('/employees');
  });

  test('バリデーションエラーが正しく表示される', async () => {
    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    // 空のフォームを送信
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(screen.getByText('名前（姓）は必須です')).toBeInTheDocument();
      expect(screen.getByText('名前（名）は必須です')).toBeInTheDocument();
      expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument();
      expect(screen.getByText('ロールは必須です')).toBeInTheDocument();
    });
  });

  test('スキル追加機能が正常に動作する', async () => {
    render(<EmployeeCreatePage />, { wrapper: createWrapper() });

    // スキル検索入力
    const skillInput = screen.getByPlaceholderText('スキル名で検索...');
    fireEvent.change(skillInput, { target: { value: 'JavaScript' } });

    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // スキルを選択
    fireEvent.click(screen.getByText('JavaScript'));

    await waitFor(() => {
      expect(screen.getByText('選択済みスキル')).toBeInTheDocument();
    });
  });
});
