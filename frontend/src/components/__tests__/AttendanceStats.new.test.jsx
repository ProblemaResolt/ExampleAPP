import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils/test-utils.js'
import AttendanceStats from '../AttendanceStats.jsx'

const mockMonthlyStats = {
  workDays: 20,
  totalHours: 160,
  overtimeHours: 10,
  leaveDays: 2,
  lateCount: 1,
  transportationCost: 10000
}

describe('AttendanceStats', () => {
  const mockCurrentDate = new Date('2025-06-09')
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('月次統計データを正しく表示する', () => {
    render(
      <AttendanceStats 
        monthlyStats={mockMonthlyStats} 
        currentDate={mockCurrentDate} 
      />
    )
    
    expect(screen.getByText('2025年6月 勤務統計')).toBeInTheDocument()
    expect(screen.getByText('出勤日数')).toBeInTheDocument()
    expect(screen.getByText('総労働時間')).toBeInTheDocument()
    expect(screen.getByText('遅刻回数')).toBeInTheDocument()
    expect(screen.getByText('休暇日数')).toBeInTheDocument()
  })

  it('統計値が正しく表示される', () => {
    render(
      <AttendanceStats 
        monthlyStats={mockMonthlyStats} 
        currentDate={mockCurrentDate} 
      />
    )
    
    expect(screen.getByText(/20/)).toBeInTheDocument()
    expect(screen.getByText(/160/)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('monthlyStatsがnullの場合でもエラーにならない', () => {
    render(
      <AttendanceStats 
        monthlyStats={null} 
        currentDate={mockCurrentDate} 
      />
    )
    
    expect(screen.getByText('2025年6月 勤務統計')).toBeInTheDocument()
    expect(screen.getByText('出勤日数')).toBeInTheDocument()
  })

  it('monthlyStatsが未定義の場合でもエラーにならない', () => {
    render(
      <AttendanceStats 
        monthlyStats={undefined} 
        currentDate={mockCurrentDate} 
      />
    )
    
    expect(screen.getByText('2025年6月 勤務統計')).toBeInTheDocument()
    expect(screen.getByText('出勤日数')).toBeInTheDocument()
  })

  it('コンソールにデバッグ情報が出力される', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    render(
      <AttendanceStats 
        monthlyStats={mockMonthlyStats} 
        currentDate={mockCurrentDate} 
      />
    )
    
    expect(consoleSpy).toHaveBeenCalledWith('📊 AttendanceStats received monthlyStats:', mockMonthlyStats)
    expect(consoleSpy).toHaveBeenCalledWith('📊 AttendanceStats - lateCount specifically:', mockMonthlyStats.lateCount)
    
    consoleSpy.mockRestore()
  })

  describe('遅刻カウント問題の検証', () => {
    it('遅刻カウントが正しく表示される', () => {
      render(
        <AttendanceStats 
          monthlyStats={mockMonthlyStats} 
          currentDate={mockCurrentDate} 
        />
      )
      
      expect(screen.getByText('遅刻回数')).toBeInTheDocument()
    })

    it('遅刻カウントが0の場合も正しく表示される', () => {
      const statsWithNoLate = { ...mockMonthlyStats, lateCount: 0 }
      render(
        <AttendanceStats 
          monthlyStats={statsWithNoLate} 
          currentDate={mockCurrentDate} 
        />
      )
      
      expect(screen.getByText('遅刻回数')).toBeInTheDocument()
    })

    it('遅刻カウントが複数の場合も正しく表示される', () => {
      const statsWithMultipleLate = { ...mockMonthlyStats, lateCount: 3 }
      render(
        <AttendanceStats 
          monthlyStats={statsWithMultipleLate} 
          currentDate={mockCurrentDate} 
        />
      )
      
      expect(screen.getByText('遅刻回数')).toBeInTheDocument()
    })
  })
})
