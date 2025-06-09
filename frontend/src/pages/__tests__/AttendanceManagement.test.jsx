import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils/test-utils'
import AttendanceManagement from '../AttendanceManagement'

// AuthContextを適切にモック
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
    
    // ページタイトルの確認
    expect(screen.getByText(/勤怠管理/)).toBeInTheDocument()
  })

  it('月次統計が正しく表示される', async () => {
    render(<AttendanceManagement />)
    
    // APIからのデータ読み込みを待機
    await waitFor(() => {
      expect(screen.getByText(/出勤日数/)).toBeInTheDocument()
    }, { timeout: 3000 })

    // 統計情報の確認
    expect(screen.getByText(/総労働時間/)).toBeInTheDocument()
    expect(screen.getByText(/遅刻回数/)).toBeInTheDocument()
  })

  it('遅刻カウントが正しく表示される', async () => {
    render(<AttendanceManagement />)
    
    // 遅刻カウントの表示を待機
    await waitFor(() => {
      const lateCountElement = screen.getByText(/遅刻回数.*1.*回/)
      expect(lateCountElement).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('勤怠データテーブルが表示される', async () => {
    render(<AttendanceManagement />)
    
    // テーブルの表示を待機
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
  
  it('エラー状態が正しく処理される', async () => {
    // MSWハンドラーでエラーをシミュレート
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
    
    // エラーメッセージの表示を確認
    await waitFor(() => {
      expect(screen.getByText(/エラー/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Timezone Fix Verification Tests', () => {
  it('時間表示が JST で正しく表示される', async () => {
    render(<AttendanceManagement />)
    
    // 時間データの表示を待機
    await waitFor(() => {
      // JSTタイムゾーンで表示されていることを確認
      expect(screen.getByText(/JST/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('遅刻判定が正しく動作している', async () => {
    render(<AttendanceManagement />)
    
    await waitFor(() => {
      // 10:15の出勤時刻で10:00開始の場合、遅刻として判定されている
      const lateIndicator = screen.getByText(/遅刻回数.*1.*回/)
      expect(lateIndicator).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('正常出勤は遅刻としてカウントされない', async () => {
    // MSWで遅刻なしのデータを返すハンドラーを設定
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
                clockIn: '10:00 JST', // 正時出勤
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
              lateCount: 0, // 遅刻なし
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
      // 遅刻カウントが0であることを確認
      expect(screen.getByText(/遅刻回数.*0.*回/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
