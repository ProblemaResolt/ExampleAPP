import { test, expect } from '@playwright/test'

test.describe('勤怠管理機能 E2E テスト', () => {
  test.beforeEach(async ({ page }) => {
    // ログインページに移動してログイン
    await page.goto('/login')
    
    // ログインフォームに入力
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // ダッシュボードまたは勤怠管理ページに移動
    await page.waitForURL('**/dashboard')
  })

  test('勤怠管理ページの基本表示', async ({ page }) => {
    // 勤怠管理ページに移動
    await page.goto('/attendance')
    
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('勤怠管理')
    
    // 月次統計セクションの確認
    await expect(page.locator('[data-testid="monthly-stats"]')).toBeVisible()
    
    // 勤怠テーブルの確認
    await expect(page.locator('table')).toBeVisible()
  })

  test('月次統計の遅刻カウント表示', async ({ page }) => {
    await page.goto('/attendance')
    
    // 遅刻カウントの要素を待機
    await page.waitForSelector('[data-testid="late-count"]', { timeout: 5000 })
    
    // 遅刻カウントが表示されている
    const lateCountElement = page.locator('[data-testid="late-count"]')
    await expect(lateCountElement).toBeVisible()
    
    // 数値が含まれていることを確認
    const lateCountText = await lateCountElement.textContent()
    expect(lateCountText).toMatch(/\d+/)
  })

  test('時間表示がJSTで正しく表示される', async ({ page }) => {
    await page.goto('/attendance')
    
    // 時間表示の要素を待機
    await page.waitForSelector('[data-testid="clock-in-time"]', { timeout: 5000 })
    
    // JST表示があることを確認
    const timeElements = page.locator('text=/JST/')
    await expect(timeElements.first()).toBeVisible()
  })

  test('勤怠データの編集機能', async ({ page }) => {
    await page.goto('/attendance')
    
    // 編集ボタンをクリック
    await page.click('[data-testid="edit-attendance-btn"]')
    
    // 編集モーダルが表示される
    await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible()
    
    // 時間入力フィールドに値を入力
    await page.fill('input[name="clockIn"]', '09:30')
    await page.fill('input[name="clockOut"]', '18:30')
    
    // 保存ボタンをクリック
    await page.click('[data-testid="save-btn"]')
    
    // 成功メッセージの確認
    await expect(page.locator('.success-message')).toBeVisible()
  })

  test('月切り替え機能', async ({ page }) => {
    await page.goto('/attendance')
    
    // 月選択ドロップダウンをクリック
    await page.click('[data-testid="month-selector"]')
    
    // 前月を選択
    await page.click('[data-value="5"]') // 5月を選択
    
    // データが更新されることを確認
    await page.waitForLoadState('networkidle')
    
    // URLパラメータが更新されている
    await expect(page).toHaveURL(/month=5/)
  })

  test('エラー状態の処理', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/attendance/monthly/**', route => {
      route.abort()
    })
    
    await page.goto('/attendance')
    
    // エラーメッセージが表示される
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=/エラー/')).toBeVisible()
  })

  test('ローディング状態の表示', async ({ page }) => {
    // APIレスポンスを遅延
    await page.route('**/api/attendance/monthly/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      route.continue()
    })
    
    await page.goto('/attendance')
    
    // ローディング表示の確認
    await expect(page.locator('[data-testid="loading"]')).toBeVisible()
    
    // データ読み込み完了後、ローディングが消える
    await expect(page.locator('[data-testid="loading"]')).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('タイムゾーン修正の検証', () => {
  test('遅刻判定が正しく動作する', async ({ page }) => {
    await page.goto('/attendance')
    
    // 遅刻データが正しく判定されている
    await page.waitForSelector('[data-testid="late-indicator"]', { timeout: 5000 })
    
    const lateIndicators = page.locator('[data-testid="late-indicator"]')
    const count = await lateIndicators.count()
    
    // 遅刻エントリの数を確認
    expect(count).toBeGreaterThan(0)
  })

  test('正常出勤が遅刻として誤判定されない', async ({ page }) => {
    // 正常出勤データのAPIモック
    await page.route('**/api/attendance/monthly/2025/6', async route => {
      const response = {
        status: 'success',
        data: {
          attendanceData: {
            '2025-06-01': {
              id: 'test-1',
              clockIn: '10:00 JST',
              clockOut: '18:00 JST',
              status: 'APPROVED'
            }
          },
          monthlyStats: {
            year: 2025,
            month: 6,
            workDays: 1,
            lateCount: 0, // 遅刻なし
            totalHours: 8
          },
          workSettings: {
            startTime: '10:00'
          }
        }
      }
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
    
    await page.goto('/attendance')
    
    // 遅刻カウントが0であることを確認
    await expect(page.locator('text=/遅刻回数.*0.*回/')).toBeVisible()
  })
})
