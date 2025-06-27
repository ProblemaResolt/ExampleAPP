import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddMemberDialog from '../src/components/AddMemberDialog';

// テスト用のQueryClientを作成
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AddMemberDialog Allocation Display', () => {
  const mockProject = {
    id: 'project1',
    name: 'Test Project',
    members: [
      {
        id: 'member1',
        userId: 'user1',
        allocation: 0.5,
        user: { id: 'user1', firstName: '太郎', lastName: '田中' }
      }
    ]
  };

  const mockUser = {
    id: 'user1',
    firstName: '太郎',
    lastName: '田中',
    role: 'COMPANY'
  };

  test('既存メンバーの工数配分が正しく表示される', () => {
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    // APIモック
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            projects: [
              {
                id: 'project1',
                members: [
                  { userId: 'user1', allocation: 0.5 },
                  { userId: 'user1', allocation: 0.3 } // 他のプロジェクト
                ]
              }
            ]
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            users: [
              {
                id: 'user1',
                firstName: '太郎',
                lastName: '田中',
                email: 'taro@example.com',
                totalAllocation: 0.8 // 既存の総工数
              }
            ]
          }
        })
      });

    render(
      <TestWrapper>
        <AddMemberDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          project={mockProject}
          currentUser={mockUser}
          title="テスト"
        />
      </TestWrapper>
    );

    // 工数表示が80%（0.8 * 100）として表示されることを確認
    expect(screen.getByText(/80%/)).toBeInTheDocument();
  });
});
