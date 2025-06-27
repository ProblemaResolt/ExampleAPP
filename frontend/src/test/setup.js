import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// MSW（Mock Service Worker）サーバーのセットアップ
export const server = setupServer(...handlers)

// テスト実行前にサーバーを起動
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// 各テスト後にリクエストハンドラーをリセット
afterEach(() => {
  server.resetHandlers()
})

// テスト完了後にサーバーを停止
afterAll(() => {
  server.close()
})

// グローバルなテスト設定
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {
    this.cb([{ borderBoxSize: { inlineSize: 0, blockSize: 0 } }], this);
  }
  unobserve() {}
  disconnect() {}
}

// Matchmedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// localStorage mock
const localStorageMock = {
  getItem: (key) => localStorageMock._storage[key] || null,
  setItem: (key, value) => { localStorageMock._storage[key] = value },
  removeItem: (key) => { delete localStorageMock._storage[key] },
  clear: () => { localStorageMock._storage = {} },
  _storage: {}
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// location.href モック (ナビゲーション用)
delete window.location
window.location = { href: '/' }
