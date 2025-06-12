import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectEditDialog from '../src/components/ProjectEditDialog';

// Mock modules
vi.mock('../src/utils/validation', () => ({
  projectSchema: {
    validate: vi.fn().mockResolvedValue({ values: {}, errors: {} })
  },
  statusLabels: {
    'PLANNED': '計画中',
    'IN_PROGRESS': '進行中',
    'COMPLETED': '完了',
    'ON_HOLD': '保留'
  }
}));

// Mock AddMemberDialog
vi.mock('../src/components/AddMemberDialog', () => ({
  default: ({ open, onSubmit, roleFilter, title, onClose }) => {
    if (!open) return null;
    
    const handleMockSubmit = () => {
      // roleFilterに基づいてモックユーザーを返す
      if (roleFilter && roleFilter.includes('MANAGER')) {
        onSubmit([{
          id: 2,
          firstName: 'マネージャー',
          lastName: '太郎',
          role: 'MANAGER',
          email: 'manager@test.com'
        }]);
      } else if (roleFilter && roleFilter.includes('MEMBER')) {
        onSubmit([{
          id: 3,
          firstName: 'メンバー',
          lastName: '太郎',
          role: 'MEMBER',
          email: 'member@test.com'
        }]);
      }
    };

    return (
      <div data-testid="add-member-dialog">
        <h3>{title}</h3>
        <div>Role Filter: {roleFilter ? roleFilter.join(', ') : 'None'}</div>
        <button onClick={handleMockSubmit}>Add Selected</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
}));

// Test wrapper
const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock data
const mockMembersData = {
  users: [
    {
      id: 1,
      firstName: '管理',
      lastName: '太郎',
      email: 'admin@test.com',
      role: 'ADMIN',
      position: '管理者'
    },
    {
      id: 2,
      firstName: 'マネージャー',
      lastName: '太郎',
      email: 'manager@test.com',
      role: 'MANAGER',
      position: 'プロジェクトマネージャー'
    },
    {
      id: 3,
      firstName: 'メンバー',
      lastName: '太郎',
      email: 'member@test.com',
      role: 'MEMBER',
      position: '開発者'
    }
  ]
};

const mockProject = {
  id: 1,
  name: '既存プロジェクト',
  description: '既存の説明',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T00:00:00Z',
  status: 'IN_PROGRESS',
  clientCompanyName: 'クライアント会社',
  clientContactName: '担当者',
  clientContactEmail: 'contact@client.com',
  managers: [{ id: 2 }],
  members: [{ id: 3 }]
};

describe('ProjectEditDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnClose.mockClear();
  });

  it('should render project creation dialog correctly', () => {
    render(
      <TestWrapper>
        <ProjectEditDialog
          open={true}
          onClose={mockOnClose}
          project={null}
          onSubmit={mockOnSubmit}
          membersData={mockMembersData}
        />
      </TestWrapper>
    );

    expect(screen.getByText('プロジェクトを追加')).toBeInTheDocument();
    expect(screen.getByLabelText('プロジェクト名')).toBeInTheDocument();
    expect(screen.getByLabelText('説明')).toBeInTheDocument();
    expect(screen.getByText('作成')).toBeInTheDocument();
  });

  it('should render project edit dialog with existing data', () => {
    render(
      <TestWrapper>
        <ProjectEditDialog
          open={true}
          onClose={mockOnClose}
          project={mockProject}
          onSubmit={mockOnSubmit}
          membersData={mockMembersData}
        />
      </TestWrapper>
    );

    expect(screen.getByText('プロジェクトを編集')).toBeInTheDocument();
    expect(screen.getByDisplayValue('既存プロジェクト')).toBeInTheDocument();
    expect(screen.getByDisplayValue('既存の説明')).toBeInTheDocument();
    expect(screen.getByDisplayValue('クライアント会社')).toBeInTheDocument();
    expect(screen.getByText('更新')).toBeInTheDocument();
  });

  it('should open manager selection dialog with correct role filter', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ProjectEditDialog
          open={true}
          onClose={mockOnClose}
          project={null}
          onSubmit={mockOnSubmit}
          membersData={mockMembersData}
        />
      </TestWrapper>
    );

    // マネージャー選択ボタンをクリック
    const managerButton = screen.getByText('選択');
    await user.click(managerButton);

    // AddMemberDialogが開かれることを確認
    expect(screen.getByTestId('add-member-dialog')).toBeInTheDocument();
    expect(screen.getByText('マネージャーを選択')).toBeInTheDocument();
    expect(screen.getByText('Role Filter: COMPANY, MANAGER')).toBeInTheDocument();
  });

  it('should handle manager selection correctly', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ProjectEditDialog
          open={true}
          onClose={mockOnClose}
          project={null}
          onSubmit={mockOnSubmit}
          membersData={mockMembersData}
        />
      </TestWrapper>
    );

    // マネージャー選択ボタンをクリック
    const managerButton = screen.getByText('選択');
    await user.click(managerButton);

    // モックのマネージャーを選択
    const addSelectedButton = screen.getByText('Add Selected');
    await user.click(addSelectedButton);

    // マネージャーが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('マネージャー 太郎')).toBeInTheDocument();
    });

    // ダイアログが閉じられることを確認
    expect(screen.queryByTestId('add-member-dialog')).not.toBeInTheDocument();
  });

  it('should handle client company name change correctly', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ProjectEditDialog
          open={true}
          onClose={mockOnClose}
          project={null}
          onSubmit={mockOnSubmit}
          membersData={mockMembersData}
        />
      </TestWrapper>
    );

    // まずマネージャーを選択
    const managerButton = screen.getByText('選択');
    await user.click(managerButton);
    const addSelectedButton = screen.getByText('Add Selected');
    await user.click(addSelectedButton);

    // クライアント企業名を「自社」に変更
    const clientCompanyInput = screen.getByLabelText('クライアント企業名');
    await user.clear(clientCompanyInput);
    await user.type(clientCompanyInput, '自社');

    // 担当者情報が自動入力されることを確認
    await waitFor(() => {
      expect(screen.getByDisplayValue('マネージャー 太郎')).toBeInTheDocument();
      expect(screen.getByDisplayValue('manager@test.com')).toBeInTheDocument();
    });
  });

  it('should handle form submission correctly', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ProjectEditDialog
          open={true}
          onClose={mockOnClose}
          project={null}
          onSubmit={mockOnSubmit}
          membersData={mockMembersData}
        />
      </TestWrapper>
    );

    // プロジェクト名を入力
    const nameInput = screen.getByLabelText('プロジェクト名');
    await user.type(nameInput, 'テストプロジェクト');

    // 開始日を設定
    const startDateInput = screen.getByLabelText('開始日');
    await user.type(startDateInput, '2024-01-01');

    // マネージャーを選択
    const managerButton = screen.getByText('選択');
    await user.click(managerButton);
    const addSelectedButton = screen.getByText('Add Selected');
    await user.click(addSelectedButton);

    // フォームを送信
    const submitButton = screen.getByText('作成');
    await user.click(submitButton);

    // onSubmitが正しいデータで呼び出されることを確認
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'テストプロジェクト',
          startDate: '2024-01-01',
          managerIds: [2],
          isCreating: true
        }),
        expect.any(Object)
      );
    });
  });

  it('should show validation warning when no managers are available', () => {
    const noManagersData = {
      users: [
        {
          id: 3,
          firstName: 'メンバー',
          lastName: '太郎',
          role: 'MEMBER'
        }
      ]
    };

    render(
      <TestWrapper>
        <ProjectEditDialog
          open={true}
          onClose={mockOnClose}
          project={null}
          onSubmit={mockOnSubmit}
          membersData={noManagersData}
        />
      </TestWrapper>
    );

    expect(screen.getByText('マネージャーロールを持つユーザーがいません。プロジェクトを作成するにはマネージャーが必要です。')).toBeInTheDocument();
  });

  it('should handle existing project member addition', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ProjectEditDialog
          open={true}
          onClose={mockOnClose}
          project={mockProject}
          onSubmit={mockOnSubmit}
          membersData={mockMembersData}
        />
      </TestWrapper>
    );

    // 既存のマネージャーが表示されることを確認
    expect(screen.getByText('マネージャー 太郎')).toBeInTheDocument();

    // 新しいマネージャーを追加
    const managerButton = screen.getByText('追加');
    await user.click(managerButton);
    const addSelectedButton = screen.getByText('Add Selected');
    await user.click(addSelectedButton);

    // 既存と新規のマネージャーが両方表示されることを確認
    const managerTags = screen.getAllByText('マネージャー 太郎');
    expect(managerTags).toHaveLength(2);
  });
});
