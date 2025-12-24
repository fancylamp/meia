import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

const chromeMock = {
  runtime: {
    getURL: (path: string) => `chrome-extension://mock-id/${path}`,
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
}

vi.stubGlobal('chrome', chromeMock)
vi.stubGlobal('fetch', vi.fn())

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})
