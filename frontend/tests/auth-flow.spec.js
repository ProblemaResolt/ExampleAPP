// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost');
    await page.evaluate(() => localStorage.clear());
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('http://localhost/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should login with valid credentials and fetch user data', async ({ page }) => {
    await page.goto('http://localhost/login');
    
    // Fill login form
    await page.fill('input[name="email"]', 'testcompany@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    
    // Listen for API calls
    const userMePromise = page.waitForResponse(response => 
      response.url().includes('/api/users/me') && response.status() === 200
    );
    
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Ensure user data is fetched
    await userMePromise;
    
    // Check if dashboard shows user-specific content
    await expect(page.locator('h2:has-text("ダッシュボード")')).toBeVisible();
  });

  test('should store only token in localStorage, not user data', async ({ page }) => {
    await page.goto('http://localhost/login');
    
    await page.fill('input[name="email"]', 'testcompany@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check localStorage contains only token
    const localStorageItems = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });
    
    expect(localStorageItems).toHaveProperty('token');
    expect(localStorageItems).not.toHaveProperty('user');
    expect(localStorageItems).not.toHaveProperty('userData');
  });

  test('should fetch user data on page refresh', async ({ page }) => {
    // Login first
    await page.goto('http://localhost/login');
    await page.fill('input[name="email"]', 'testcompany@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Refresh page
    const userMePromise = page.waitForResponse(response => 
      response.url().includes('/api/users/me') && response.status() === 200
    );
    
    await page.reload();
    
    // Ensure user data is fetched again
    await userMePromise;
    await expect(page.locator('h2:has-text("ダッシュボード")')).toBeVisible();
  });

  test('should handle 403 errors gracefully', async ({ page }) => {
    // Inject invalid token
    await page.goto('http://localhost');
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid-token');
    });
    
    await page.goto('http://localhost/dashboard');
    
    // Should redirect to login due to invalid token
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should logout and clear token', async ({ page }) => {
    // Login first
    await page.goto('http://localhost/login');
    await page.fill('input[name="email"]', 'testcompany@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check token exists
    const tokenExists = await page.evaluate(() => !!localStorage.getItem('token'));
    expect(tokenExists).toBe(true);
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Check token is removed
    await expect(page).toHaveURL(/.*\/login/);
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
    expect(tokenAfterLogout).toBeNull();
  });
});
