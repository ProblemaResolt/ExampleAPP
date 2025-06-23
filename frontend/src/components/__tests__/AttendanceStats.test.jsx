import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils/test-utils.js'
import AttendanceStats from '../AttendanceStats.jsx'

describe('AttendanceStats', () => {
  const mockCurrentDate = new Date(2024, 0, 15) // 2024年1月15日
  const mockMonthlyStats = {
    workDays: 20,
    totalHours: 160.5,
    overtimeHours: 15.25,
    leaveDays: 2,
    lateCount: 3,
    transportationCost: 15000
  }

  it('should import without errors', async () => {
    const module = await import('../AttendanceStats.jsx')
    expect(module.default).toBeDefined()
  })

  it('should render component with stats', () => {
    render(
      <AttendanceStats 
        monthlyStats={mockMonthlyStats} 
        currentDate={mockCurrentDate} 
      />
    )
    
    expect(screen.getByText('2024年1月 勤務統計')).toBeInTheDocument()
    expect(screen.getByText('出勤日数')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('総勤務時間')).toBeInTheDocument()
    expect(screen.getByText('160:30')).toBeInTheDocument()
  })

  it('should handle empty stats gracefully', () => {
    render(
      <AttendanceStats 
        monthlyStats={{}} 
        currentDate={mockCurrentDate} 
      />
    )
    
    expect(screen.getByText('2024年1月 勤務統計')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})