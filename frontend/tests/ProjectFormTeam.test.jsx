import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectForm from '../src/components/projects/ProjectForm';
import api from '../src/utils/axios';

// API モック
vi.mock('../src/utils/axios', () => ({
  default: {
    get: vi.fn()
  }
}));

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ProjectForm チーム設定テスト', () => {
  const mockUsers = {
    users: [
      { id: 'user1', firstName: '太郎', lastName: '田中', email: 'tanaka@example.com' },
      { id: 'user2', firstName: '花子', lastName: '佐藤', email: 'sato@example.com' },
      { id: 'user3', firstName: '次郎', lastName: '鈴木', email: 'suzuki@example.com' }
    ]
  };

  const mockProject = {
    id: 'project1',
    name: 'テストプロジェクト',
    description: 'テスト用プロジェクト',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-12-31T00:00:00.000Z',
    members: [
      { user: { id: 'user1', firstName: '太郎', lastName: '田中' }, isManager: true },
      { user: { id: 'user2', firstName: '花子', lastName: '佐藤' }, isManager: false }
    ]
  };
  beforeEach(() => {
    vi.clearAllMocks();
    // API モックの設定
    api.get.mockResolvedValue({ data: mockUsers });
  });

  test('選択されたマネージャーの名前が表示される', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <TestWrapper>
        <ProjectForm
          project={mockProject}
          onSubmit={mockOnSubmit}
          isPageMode={true}
        />
      </TestWrapper>
    );

    // マネージャーの名前が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
    });

    // 選択されたマネージャーセクションが表示される
    expect(screen.getByText('選択されたマネージャー:')).toBeInTheDocument();
  });

  test('選択されたメンバーの名前が表示される', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <TestWrapper>
        <ProjectForm
          project={mockProject}
          onSubmit={mockOnSubmit}
          isPageMode={true}
        />
      </TestWrapper>
    );

    // メンバーの名前が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
    });

    // 選択されたメンバーセクションが表示される
    expect(screen.getByText('選択されたメンバー:')).toBeInTheDocument();
  });

  test('新規プロジェクト作成時は選択済みメンバーが表示されない', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <TestWrapper>
        <ProjectForm
          onSubmit={mockOnSubmit}
          isPageMode={true}
        />
      </TestWrapper>
    );

    // 選択されたメンバーのセクションが表示されない
    expect(screen.queryByText('選択されたマネージャー:')).not.toBeInTheDocument();
    expect(screen.queryByText('選択されたメンバー:')).not.toBeInTheDocument();
    
    // 選択ボタンは表示される
    expect(screen.getByText('マネージャーを選択')).toBeInTheDocument();
    expect(screen.getByText('メンバーを追加')).toBeInTheDocument();
  });

  test('削除ボタンが表示される', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <TestWrapper>
        <ProjectForm
          project={mockProject}
          onSubmit={mockOnSubmit}
          isPageMode={true}
        />
      </TestWrapper>
    );

    // 削除ボタンが表示されるまで待機
    await waitFor(() => {
      // 各メンバーに削除ボタン（×）が表示される
      const deleteButtons = screen.getAllByTitle('削除');
      expect(deleteButtons).toHaveLength(2); // マネージャー1人 + メンバー1人
    });
  });
});
