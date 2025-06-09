import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils/test-utils.js'
import AttendanceManagement from '../AttendanceManagement.jsx'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User'
    }
  })
}))

describe('AttendanceManagement Integration Tests', () => {
  it('ページが正しく読み込まれる', async () => {
    render(<AttendanceManagement />)
    
    expect(screen.getByText(/勤怠管理/)).toBeInTheDocument()
  })

  it('should import without errors', async () => {
    const module = await import('../AttendanceManagement.jsx')
    expect(module.default).toBeDefined()
  })
})
