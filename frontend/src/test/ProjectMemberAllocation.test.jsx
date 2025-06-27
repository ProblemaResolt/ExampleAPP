import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ProjectMemberAllocationDialog from '../components/ProjectMemberAllocationDialog';

// モック
const mockOnSave = vi.fn();
const mockOnClose = vi.fn();

const mockMember = {
  id: 'user1',
  firstName: 'テスト',
  lastName: 'ユーザー',
  projectMembership: {
    allocation: 0.3
  },
  totalAllocation: 0.3
};

const mockProject = {
  id: 'project1',
  name: 'テストプロジェクト',
  startDate: '2025-01-01',
  endDate: '2025-12-31'
};

const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ProjectMemberAllocationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test('工数配分が正しく表示され、0.0-1.0の範囲で入力できる', async () => {
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

    // ダイアログが表示されることを確認
    expect(screen.getByText('メンバー工数の設定')).toBeInTheDocument();
    
    // メンバー名が表示されることを確認（lastName firstName の順）
    expect(screen.getByText('ユーザー テスト')).toBeInTheDocument();
    
    // プロジェクト名が表示されることを確認
    expect(screen.getByText('プロジェクト: テストプロジェクト')).toBeInTheDocument();
    
    // 工数入力フィールドを確認
    const allocationInput = screen.getByDisplayValue('0.3');
    expect(allocationInput).toBeInTheDocument();
    expect(allocationInput).toHaveAttribute('min', '0');
    expect(allocationInput).toHaveAttribute('max', '1');
    expect(allocationInput).toHaveAttribute('step', '0.1');
  });
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ allocation: 0.5 });
    });
  });

  test('0-100%の範囲外の値でバリデーションエラーが表示される', async () => {
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

    const allocationInput = screen.getByDisplayValue('30');

    // 101%を入力
    fireEvent.change(allocationInput, { target: { value: '101' } });
    fireEvent.blur(allocationInput);

    // バリデーションエラーが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('工数は0%から100%の間で入力してください')).toBeInTheDocument();
    });

    // 保存ボタンが無効化されることを確認
    const saveButton = screen.getByText('保存');
    expect(saveButton).toBeDisabled();
  });

  test('30%入力時に0.3として保存される', async () => {
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

    const allocationInput = screen.getByDisplayValue('30');
    
    // 30%を明示的に入力
    fireEvent.change(allocationInput, { target: { value: '30' } });
    
    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    // onSaveが0.3で呼ばれることを確認
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ allocation: 0.3 });
    });
  });
});
