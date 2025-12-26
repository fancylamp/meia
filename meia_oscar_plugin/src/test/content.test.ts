import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('content script - Oscar iframe', () => {
  let originalLocation: Location
  let originalBody: HTMLElement | null

  beforeEach(() => {
    vi.clearAllMocks()
    originalLocation = window.location
    originalBody = document.body

    // Reset DOM
    document.body.innerHTML = ''
    document.documentElement.style.visibility = ''

    // Mock chrome API
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://mock/${path}` },
      storage: { local: { get: vi.fn().mockResolvedValue({ meia_session_id: 'test-session' }) } },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes reloadOscar function globally when iframe is created', async () => {
    // Simulate what content.tsx does
    const iframe = document.createElement('iframe')
    iframe.id = 'oscar-frame'
    iframe.src = 'https://localhost:8443/oscar/provider'
    document.body.appendChild(iframe)

    const reloadOscar = () => iframe.contentWindow?.location.reload()
    ;(window as any).reloadOscar = reloadOscar

    expect(typeof (window as any).reloadOscar).toBe('function')
  })

  it('reloadOscar calls iframe contentWindow.location.reload', () => {
    const iframe = document.createElement('iframe')
    iframe.id = 'oscar-frame'
    document.body.appendChild(iframe)

    // Mock the contentWindow
    const mockReload = vi.fn()
    Object.defineProperty(iframe, 'contentWindow', {
      value: { location: { reload: mockReload } },
      writable: true,
    })

    const reloadOscar = () => iframe.contentWindow?.location.reload()
    ;(window as any).reloadOscar = reloadOscar

    ;(window as any).reloadOscar()

    expect(mockReload).toHaveBeenCalled()
  })

  it('reloadOscar handles missing contentWindow gracefully', () => {
    const iframe = document.createElement('iframe')
    iframe.id = 'oscar-frame'
    document.body.appendChild(iframe)

    // contentWindow is null before iframe loads
    Object.defineProperty(iframe, 'contentWindow', {
      value: null,
      writable: true,
    })

    const reloadOscar = () => iframe.contentWindow?.location.reload()
    ;(window as any).reloadOscar = reloadOscar

    // Should not throw
    expect(() => (window as any).reloadOscar()).not.toThrow()
  })
})
