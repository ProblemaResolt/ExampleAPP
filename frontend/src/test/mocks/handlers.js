import { http, HttpResponse } from 'msw'

// APIモックのベースURL
const API_BASE = 'http://localhost:4000/api'

export const handlers = [
  // 月次勤怠データAPI
  http.get(`${API_BASE}/attendance/monthly/:year/:month`, ({ params }) => {
    const { year, month } = params
    
    // テスト用のモックデータ
    return HttpResponse.json({
      status: 'success',
      data: {
        attendanceData: {
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
            clockIn: '10:15 JST', // 遅刻データ
            clockOut: '18:00 JST',
            breakTime: 60,
            workHours: 7.25,
            overtimeHours: 0,
            status: 'PENDING',
            note: '電車遅延のため',
            leaveType: null,
            transportationCost: 500
          }
        },
        monthlyStats: {
          year: parseInt(year),
          month: parseInt(month),
          workDays: 2,
          totalHours: 15.25,
          overtimeHours: 0,
          averageHours: 7.625,
          leaveDays: 0,
          lateCount: 1, // テスト用: 1回の遅刻
          transportationCost: 1000,
          approvedCount: 1,
          pendingCount: 1,
          rejectedCount: 0
        },
        workSettings: {
          startTime: '10:00',
          endTime: '19:00',
          breakTime: 60,
          workHours: 8,
          overtimeThreshold: 8,
          settingSource: 'project'
        }
      }
    })
  }),

  // 勤務設定API
  http.get(`${API_BASE}/attendance/work-settings`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        standardHours: 8,
        breakTime: 60,
        overtimeThreshold: 8,
        defaultTransportationCost: 500,
        timeInterval: 15,
        settingSource: 'project',
        projectWorkSettingName: 'テストプロジェクト設定'
      }
    })
  }),

  // 認証テストAPI
  http.get(`${API_BASE}/attendance/test-auth`, () => {
    return HttpResponse.json({
      message: 'Authenticated test successful',
      timestamp: new Date(),
      userId: 'test-user-id',
      workSettingsFixed: true,
      effectiveSettings: {
        startTime: '10:00',
        endTime: '19:00',
        breakTime: 60,
        workHours: 8
      }
    })
  }),

  // ログイン API
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json()
    
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        status: 'success',
        data: {
          token: 'test-jwt-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            firstName: '太郎',
            lastName: '山田',
            role: 'USER'
          }
        }
      })
    }
    
    return HttpResponse.json(
      { status: 'error', message: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  // エラーケース用ハンドラー
  http.get(`${API_BASE}/attendance/monthly/error/test`, () => {
    return HttpResponse.json(
      { status: 'error', message: 'テスト用エラー' },
      { status: 500 }
    )
  })
]
