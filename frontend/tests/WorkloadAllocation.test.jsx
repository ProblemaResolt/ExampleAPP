import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectMemberAllocationDialog from '../src/components/ProjectMemberAllocationDialog';

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

describe('工数配分機能テスト', () => {
  const mockMember = {
    user: {
      id: 'user1',
      firstName: '太郎',
      lastName: '田中'
    },
    allocation: 0.3,
    totalAllocation: 0.8
  };

  const mockProject = {
    id: 'project1',
    name: 'テストプロジェクト'
  };

  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('0.1を設定して10%として正しく表示される', async () => {
    // 0.1の工数配分を持つメンバー
    const memberWith01 = {
      ...mockMember,
      allocation: 0.1
    };

    render(
      <TestWrapper>
        <ProjectMemberAllocationDialog
          open={true}
          onClose={mockOnClose}
          member={memberWith01}
          project={mockProject}
          onSave={mockOnSave}
        />
      </TestWrapper>
    );

    // 初期値が0.1で表示されている
    const allocationInput = screen.getByRole('spinbutton');
    expect(allocationInput.value).toBe('0.1');
    
    // パーセンテージ表示も確認（10%と表示される）
    expect(screen.getByText(/10%/)).toBeInTheDocument();
  });

  test('0.3を設定して30%として正しく表示される', async () => {
    render(
      <TestWrapper>
        <ProjectMemberAllocationDialog
          open={true}
          onClose={mockOnClose}
          member={mockMember}
          project={mockProject}
          onSave={mockOnSave}
        />
      </TestWrapper>
    );

    // 初期値が0.3で表示されている
    const allocationInput = screen.getByRole('spinbutton');
    expect(allocationInput.value).toBe('0.3');
    
    // パーセンテージ表示も確認（30%と表示される）
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });

  test('0.1入力時に正しく0.1として保存される', async () => {
    render(
      <TestWrapper>
        <ProjectMemberAllocationDialog
          open={true}
          onClose={mockOnClose}
          member={mockMember}
          project={mockProject}
          onSave={mockOnSave}
        />
      </TestWrapper>
    );

    const allocationInput = screen.getByRole('spinbutton');
    const saveButton = screen.getByText('保存');

    // 0.1を入力
    fireEvent.change(allocationInput, { target: { value: '0.1' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ allocation: 0.1 });
    });
  });

  test('0.5入力時に正しく0.5として保存される', async () => {
    render(
      <TestWrapper>
        <ProjectMemberAllocationDialog
          open={true}
          onClose={mockOnClose}
          member={mockMember}
          project={mockProject}
          onSave={mockOnSave}
        />
      </TestWrapper>
    );

    const allocationInput = screen.getByRole('spinbutton');
    const saveButton = screen.getByText('保存');

    // 0.5を入力
    fireEvent.change(allocationInput, { target: { value: '0.5' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ allocation: 0.5 });
    });
  });

  test('1.0以上の値でバリデーションエラーが表示される', async () => {
    render(
      <TestWrapper>
        <ProjectMemberAllocationDialog
          open={true}
          onClose={mockOnClose}
          member={mockMember}
          project={mockProject}
          onSave={mockOnSave}
        />
      </TestWrapper>
    );

    const allocationInput = screen.getByRole('spinbutton');
    const saveButton = screen.getByText('保存');

    // 1.5を入力（範囲外）
    fireEvent.change(allocationInput, { target: { value: '1.5' } });
    fireEvent.blur(allocationInput);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/工数は1以下である必要があります/)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('0未満の値でバリデーションエラーが表示される', async () => {
    render(
      <TestWrapper>
        <ProjectMemberAllocationDialog
          open={true}
          onClose={mockOnClose}
          member={mockMember}
          project={mockProject}
          onSave={mockOnSave}
        />
      </TestWrapper>
    );

    const allocationInput = screen.getByRole('spinbutton');
    const saveButton = screen.getByText('保存');

    // -0.1を入力（範囲外）
    fireEvent.change(allocationInput, { target: { value: '-0.1' } });
    fireEvent.blur(allocationInput);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/工数は0以上である必要があります/)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
