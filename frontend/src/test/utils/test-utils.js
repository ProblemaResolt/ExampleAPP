import { render as rtlRender } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'

// テスト用のCustom Render関数
function render(ui, { initialEntries = ['/'], ...renderOptions } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

// テスト用のモックユーザー
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: '太郎',
  lastName: '山田',
  role: 'USER'
}

// テスト用のモック勤怠データ
export const mockAttendanceData = {
  '2025-06-01': {
    id: 'test-entry-1',
    date: new Date('2025-06-01'),
    clockIn: '09:00 JST',
    clockOut: '18:00 JST',
    breakTime: 60,
    workHours: 8,
    overtimeHours: 0,
    status: 'APPROVED',
    note: null,
    leaveType: null,
    transportationCost: 500
  },
  '2025-06-02': {
    id: 'test-entry-2',
    date: new Date('2025-06-02'),
    clockIn: '10:15 JST',
    clockOut: '18:00 JST',
    breakTime: 60,
    workHours: 7.25,
    overtimeHours: 0,
    status: 'PENDING',
    note: '電車遅延のため',
    leaveType: null,
    transportationCost: 500
  }
}

// テスト用のモック月次統計
export const mockMonthlyStats = {
  year: 2025,
  month: 6,
  workDays: 2,
  totalHours: 15.25,
  overtimeHours: 0,
  averageHours: 7.625,
  leaveDays: 0,
  lateCount: 1,
  transportationCost: 1000,
  approvedCount: 1,
  pendingCount: 1,
  rejectedCount: 0
}

// カスタムマッチャー
export function expectElementToBeInDocument(element) {
  expect(element).toBeInTheDocument()
}

export function expectElementToHaveText(element, text) {
  expect(element).toHaveTextContent(text)
}

// 非同期処理待機用のヘルパー
export function waitForApiCall(timeout = 3000) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

// re-export everything
export * from '@testing-library/react'
export { render as default }
