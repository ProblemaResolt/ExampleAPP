// 遅刻判定ユーティリティのテスト
import { describe, it, expect } from 'vitest'
import { 
  timeStringToMinutes, 
  checkLateArrival, 
  calculateMonthlyStats 
} from '../lateArrivalUtils.js'

describe('lateArrivalUtils', () => {
  describe('timeStringToMinutes', () => {
    it('should convert time string to minutes correctly', () => {
      expect(timeStringToMinutes('09:00')).toBe(540)
      expect(timeStringToMinutes('10:30')).toBe(630)
      expect(timeStringToMinutes('09:00 JST')).toBe(540)
      expect(timeStringToMinutes('10:30 JST')).toBe(630)
      expect(timeStringToMinutes('')).toBe(0)
      expect(timeStringToMinutes(null)).toBe(0)
    })
  })

  describe('checkLateArrival', () => {
    it('should detect late arrival correctly', () => {
      // 正常出勤
      const onTime = checkLateArrival('09:00', '09:00')
      expect(onTime.isLate).toBe(false)
      expect(onTime.lateMinutes).toBe(0)

      // 早出
      const early = checkLateArrival('08:45', '09:00')
      expect(early.isLate).toBe(false)
      expect(early.lateMinutes).toBe(0)

      // 遅刻
      const late = checkLateArrival('09:30', '09:00')
      expect(late.isLate).toBe(true)
      expect(late.lateMinutes).toBe(30)
    })

    it('should handle JST format', () => {
      const result = checkLateArrival('10:15 JST', '10:00')
      expect(result.isLate).toBe(true)
      expect(result.lateMinutes).toBe(15)
    })

    it('should handle project work settings start time', () => {
      // プロジェクト勤務設定で10:00開始の場合
      const onTime = checkLateArrival('10:00 JST', '10:00')
      expect(onTime.isLate).toBe(false)
      
      const early = checkLateArrival('09:45 JST', '10:00')
      expect(early.isLate).toBe(false)
      
      const late = checkLateArrival('10:05 JST', '10:00')
      expect(late.isLate).toBe(true)
      expect(late.lateMinutes).toBe(5)
    })

    it('should handle invalid inputs gracefully', () => {
      const result1 = checkLateArrival('', '09:00')
      expect(result1.isLate).toBe(false)
      
      const result2 = checkLateArrival('09:00', '')
      expect(result2.isLate).toBe(false)
      
      const result3 = checkLateArrival(null, '09:00')
      expect(result3.isLate).toBe(false)
    })
  })

  describe('calculateMonthlyStats', () => {
    const mockAttendanceData = {
      '2025-06-01': {
        clockIn: '09:00 JST',
        clockOut: '18:00 JST',
        workHours: 8,
        transportationCost: 500
      },
      '2025-06-02': {
        clockIn: '09:15 JST', // 15分遅刻
        clockOut: '18:00 JST',
        workHours: 7.75,
        transportationCost: 500
      },
      '2025-06-03': {
        clockIn: '09:00 JST',
        clockOut: '19:00 JST',
        workHours: 9, // 1時間残業
        transportationCost: 500,
        leaveType: '' // 空文字は休暇とみなさない
      },
      '2025-06-04': {
        clockIn: null,
        clockOut: null,
        workHours: 0,
        transportationCost: 0,
        leaveType: '有給' // 休暇
      }
    }

    const mockWorkSettings = {
      workStartTime: '09:00',
      overtimeThreshold: 8
    }

    it('should calculate monthly stats correctly', () => {
      const stats = calculateMonthlyStats(mockAttendanceData, mockWorkSettings)
      
      expect(stats.workDays).toBe(3) // 出勤した日数
      expect(stats.totalHours).toBe(24.75) // 8 + 7.75 + 9
      expect(stats.overtimeHours).toBe(1) // 9 - 8 = 1時間のみ
      expect(stats.lateCount).toBe(1) // 09:15の1件のみ
      expect(stats.leaveDays).toBe(1) // 有給の1件
      expect(stats.transportationCost).toBe(1500) // 500 * 3日分
    })

    it('should handle project work settings with 10:00 start time', () => {
      const projectWorkSettings = {
        workStartTime: '10:00',
        overtimeThreshold: 8
      }

      const projectAttendanceData = {
        '2025-06-01': {
          clockIn: '09:45 JST', // 10:00開始なので早出
          clockOut: '18:00 JST',
          workHours: 8
        },
        '2025-06-02': {
          clockIn: '10:00 JST', // 定時
          clockOut: '18:00 JST',
          workHours: 8
        },
        '2025-06-03': {
          clockIn: '10:05 JST', // 5分遅刻
          clockOut: '18:00 JST',
          workHours: 7.92
        }
      }

      const stats = calculateMonthlyStats(projectAttendanceData, projectWorkSettings)
      
      expect(stats.lateCount).toBe(1) // 10:05の1件のみ
      expect(stats.workDays).toBe(3)
    })
  })
})
