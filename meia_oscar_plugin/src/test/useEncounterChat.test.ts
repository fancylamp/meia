import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEncounterChat } from '@/hooks/useEncounterChat'

vi.mock('@/hooks/useAuth', () => ({
  BACKEND_URL: 'http://localhost:8000',
}))

describe('useEncounterChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockResolvedValue({ json: () => Promise.resolve({}) } as Response)
  })

  it('initializes with empty messages', () => {
    const { result } = renderHook(() => useEncounterChat('test-session'))
    expect(result.current.messages).toEqual([])
    expect(result.current.sending).toBe(false)
  })

  it('adds message via addMessage', () => {
    const { result } = renderHook(() => useEncounterChat('test-session'))
    
    act(() => {
      result.current.addMessage({ text: 'Test', isUser: true })
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].text).toBe('Test')
  })

  describe('Oscar iframe reload on save_note', () => {
    it('calls reloadOscar when save_note tool_result is received', async () => {
      const mockReloadOscar = vi.fn()
      ;(window as any).reloadOscar = mockReloadOscar

      const sseData = 'data: {"type":"tool_result","name":"save_note"}\n\ndata: {"type":"response"}\n\ndata: [DONE]\n\n'
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(sseData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }
      vi.mocked(fetch).mockResolvedValue({
        body: { getReader: () => mockReader },
      } as any)

      const { result } = renderHook(() => useEncounterChat('test-session'))

      await act(async () => {
        await result.current.sendMessage('Save note')
      })

      expect(mockReloadOscar).toHaveBeenCalled()
    })

    it('does not call reloadOscar for other tools', async () => {
      const mockReloadOscar = vi.fn()
      ;(window as any).reloadOscar = mockReloadOscar

      const sseData = 'data: {"type":"tool_result","name":"search_patients"}\n\ndata: {"type":"response"}\n\ndata: [DONE]\n\n'
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(sseData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }
      vi.mocked(fetch).mockResolvedValue({
        body: { getReader: () => mockReader },
      } as any)

      const { result } = renderHook(() => useEncounterChat('test-session'))

      await act(async () => {
        await result.current.sendMessage('Search patients')
      })

      expect(mockReloadOscar).not.toHaveBeenCalled()
    })

    it('handles missing reloadOscar gracefully', async () => {
      delete (window as any).reloadOscar

      const sseData = 'data: {"type":"tool_result","name":"save_note"}\n\ndata: {"type":"response"}\n\ndata: [DONE]\n\n'
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(sseData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }
      vi.mocked(fetch).mockResolvedValue({
        body: { getReader: () => mockReader },
      } as any)

      const { result } = renderHook(() => useEncounterChat('test-session'))

      // Should not throw
      await act(async () => {
        await result.current.sendMessage('Save note')
      })

      expect(result.current.sending).toBe(false)
    })
  })
})
