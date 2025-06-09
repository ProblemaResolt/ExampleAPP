import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils/test-utils'
import AttendanceManagement from '../AttendanceManagement'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: '太郎',
      lastName: '山田',
      role: 'USER'
    },
    isAuthenticated: true,
    token: 'test-jwt-token'
  })
}))

describe('AttendanceManagement Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ページが正しく読み込まれる', async () => {
    render(<AttendanceManagement />)
    
    expect(screen.getByText(/勤怠管理/)).toBeInTheDocument()
  })

  it('月次統計が正しく表示される', async () => {
    render(<AttendanceManagement />)
    
    await waitFor(() => {
      expect(screen.getByText(/出勤日数/)).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText(/総労働時間/)).toBeInTheDocument()
    expect(screen.getByText(/遅刻回数/)).toBeInTheDocument()
  })

  it('遅刻カウントが正しく表示される', async () => {
    render(<AttendanceManagement />)
    
    await waitFor(() => {
      const lateCountElement = screen.getByText(/遅刻回数.*1.*回/)
      expect(lateCountElement).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('勤怠データテーブルが表示される', async () => {
    render(<AttendanceManagement />)
    
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
  
  it('エラー状態が正しく処理される', async () => {
    const { server } = await import('../../test/setup')
    const { http, HttpResponse } = await import('msw')
    
    server.use(
      http.get('http://localhost:4000/api/attendance/monthly/:year/:month', () => {
        return HttpResponse.json(
          { status: 'error', message: 'サーバーエラー' },
          { status: 500 }
        )
      })
    )

    render(<AttendanceManagement />)
    
    await waitFor(() => {
      expect(screen.getByText(/エラー/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Timezone Fix Verification Tests', () => {
  it('時間表示が JST で正しく表示される', async () => {
    render(<AttendanceManagement />)
    
    await waitFor(() => {
      expect(screen.getByText(/JST/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('遅刻判定が正しく動作している', async () => {
    render(<AttendanceManagement />)
    
    await waitFor(() => {
      const lateIndicator = screen.getByText(/遅刻回数.*1.*回/)
      expect(lateIndicator).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('正常出勤は遅刻としてカウントされない', async () => {
    const { server } = await import('../../test/setup')
    const { http, HttpResponse } = await import('msw')
    
    server.use(
      http.get('http://localhost:4000/api/attendance/monthly/2025/6', () => {
        return HttpResponse.json({
          status: 'success',
          data: {
            attendanceData: {
              '2025-06-01': {
                id: 'test-entry-1',
                clockIn: '10:00 JST',
                clockOut: '18:00 JST',
                workHours: 8,
                status: 'APPROVED'
              }
            },
            monthlyStats: {
              year: 2025,
              month: 6,
              workDays: 1,
              totalHours: 8,
              lateCount: 0,
              leaveDays: 0,
              approvedCount: 1,
              pendingCount: 0,
              rejectedCount: 0
            },
            workSettings: {
              startTime: '10:00',
              endTime: '19:00'
            }
          }
        })
      })
    )

    render(<AttendanceManagement />)
    
    await waitFor(() => {
      expect(screen.getByText(/遅刻回数.*0.*回/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
