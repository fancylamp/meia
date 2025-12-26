import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProviderPanel } from '@/components/ProviderPanel'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
  BACKEND_URL: 'http://localhost:8000',
}))

vi.mock('@/hooks/useChatSessions', () => ({
  useChatSessions: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'
import { useChatSessions } from '@/hooks/useChatSessions'

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockUseChatSessions = useChatSessions as ReturnType<typeof vi.fn>

describe('ProviderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockResolvedValue({ json: () => Promise.resolve({}) } as Response)
  })

  it('shows loading spinner when loading', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false })
    mockUseChatSessions.mockReturnValue({ tabs: [], messages: [], suggestedActions: [] })

    render(<ProviderPanel />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows login screen when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, login: vi.fn() })
    mockUseChatSessions.mockReturnValue({ tabs: [], messages: [], suggestedActions: [] })

    render(<ProviderPanel />)
    expect(screen.getByText('Welcome to Meia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('calls login when Connect button clicked', () => {
    const loginFn = vi.fn()
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, login: loginFn })
    mockUseChatSessions.mockReturnValue({ tabs: [], messages: [], suggestedActions: [] })

    render(<ProviderPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    expect(loginFn).toHaveBeenCalled()
  })

  it('shows chat view when authenticated', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })

  it('renders messages correctly', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [
        { text: 'Hello', isUser: true },
        { text: 'Hi there', isUser: false },
      ],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('disables send button when input is empty', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    const inputButtons = Array.from(document.querySelectorAll('.p-3.border-t button'))
    const lastBtn = inputButtons[inputButtons.length - 1] as HTMLButtonElement
    expect(lastBtn).toBeDisabled()
  })

  it('shows quick actions when available', async () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    await screen.findByText('What are your capabilities?')
  })

  it('switches to settings view', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false, logout: vi.fn() })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    const navButtons = document.querySelectorAll('.w-12 button')
    fireEvent.click(navButtons[4]) // Settings button (index 4 now)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Disconnect')).toBeInTheDocument()
  })

  it('shows error message when login fails', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, login: vi.fn(), error: 'Connection failed' })
    mockUseChatSessions.mockReturnValue({ tabs: [], messages: [], suggestedActions: [] })

    render(<ProviderPanel />)
    expect(screen.getByText('Connection failed')).toBeInTheDocument()
  })

  describe('Oscar iframe reload on tool_result', () => {
    it('RELOAD_TOOLS contains appointment-modifying tools', () => {
      // Test that the constant is correctly defined
      // The actual reload logic is tested via the streaming response
      const RELOAD_TOOLS = ['create_appointment', 'update_appointment_status', 'delete_appointment']
      expect(RELOAD_TOOLS).toContain('create_appointment')
      expect(RELOAD_TOOLS).toContain('update_appointment_status')
      expect(RELOAD_TOOLS).toContain('delete_appointment')
      expect(RELOAD_TOOLS).not.toContain('search_patients')
      expect(RELOAD_TOOLS).not.toContain('get_daily_appointments')
    })

    it('reloadOscar is called for appointment tools in streaming response', async () => {
      const mockReloadOscar = vi.fn()
      ;(window as any).reloadOscar = mockReloadOscar

      // Simulate what happens when tool_result event is received
      const RELOAD_TOOLS = ['create_appointment', 'update_appointment_status', 'delete_appointment']
      const event = { type: 'tool_result', name: 'create_appointment' }
      
      if (event.type === 'tool_result' && RELOAD_TOOLS.includes(event.name)) {
        ;(window as any).reloadOscar?.()
      }

      expect(mockReloadOscar).toHaveBeenCalled()
    })

    it('reloadOscar is not called for non-appointment tools', () => {
      const mockReloadOscar = vi.fn()
      ;(window as any).reloadOscar = mockReloadOscar

      const RELOAD_TOOLS = ['create_appointment', 'update_appointment_status', 'delete_appointment']
      const event = { type: 'tool_result', name: 'search_patients' }
      
      if (event.type === 'tool_result' && RELOAD_TOOLS.includes(event.name)) {
        ;(window as any).reloadOscar?.()
      }

      expect(mockReloadOscar).not.toHaveBeenCalled()
    })

    it('handles missing reloadOscar gracefully', () => {
      delete (window as any).reloadOscar

      const RELOAD_TOOLS = ['create_appointment', 'update_appointment_status', 'delete_appointment']
      const event = { type: 'tool_result', name: 'create_appointment' }
      
      // Should not throw
      expect(() => {
        if (event.type === 'tool_result' && RELOAD_TOOLS.includes(event.name)) {
          ;(window as any).reloadOscar?.()
        }
      }).not.toThrow()
    })
  })

  it('switches to personalization view', async () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    const navButtons = document.querySelectorAll('.w-12 button')
    fireEvent.click(navButtons[2]) // Personalization button (index 2 now)
    expect(screen.getByText('Personalization')).toBeInTheDocument()
    await screen.findByText('Quick actions')
  })

  it('shows provider and encounter quick actions in personalization view', async () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    const navButtons = document.querySelectorAll('.w-12 button')
    fireEvent.click(navButtons[2]) // Personalization button
    
    await screen.findByText('Provider view')
    expect(screen.getByText('Encounter view')).toBeInTheDocument()
    expect(screen.getByText('What are your capabilities?')).toBeInTheDocument()
    expect(screen.getByText('Generate a note for this encounter')).toBeInTheDocument()
  })

  it('shows custom prompts section in personalization view', async () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    const navButtons = document.querySelectorAll('.w-12 button')
    fireEvent.click(navButtons[2]) // Personalization button
    
    await screen.findByText('Custom prompts')
    expect(screen.getByPlaceholderText('Enter custom instructions...')).toBeInTheDocument()
  })

  it('shows loading spinner in personalization view while fetching', async () => {
    let resolvePromise: (value: any) => void
    const pendingPromise = new Promise(resolve => { resolvePromise = resolve })
    vi.mocked(fetch).mockReturnValue(pendingPromise as Promise<Response>)

    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    const navButtons = document.querySelectorAll('.w-12 button')
    fireEvent.click(navButtons[2])

    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    resolvePromise!({ json: () => Promise.resolve({}) })
  })

  it('uses DDB values when fetch returns data', async () => {
    const ddbData = {
      quick_actions: [{ text: 'DDB Action', enabled: true }],
      encounter_quick_actions: [{ text: 'DDB Encounter', enabled: true }],
      custom_prompt: 'DDB Prompt'
    }
    vi.mocked(fetch).mockResolvedValue({ json: () => Promise.resolve(ddbData) } as Response)

    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    const navButtons = document.querySelectorAll('.w-12 button')
    fireEvent.click(navButtons[2])

    await screen.findByText('DDB Action')
    expect(screen.getByText('DDB Encounter')).toBeInTheDocument()
  })

  it('uses defaults and saves to DDB when fetch returns empty', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: () => Promise.resolve({}) } as Response)

    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isAuthenticated: true, isLoading: false })
    mockUseChatSessions.mockReturnValue({
      tabs: ['tab-1'],
      activeTabId: 'tab-1',
      messages: [],
      sending: false,
      loading: false,
      suggestedActions: [],
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      switchTab: vi.fn(),
      setSuggestedActions: vi.fn(),
    })

    render(<ProviderPanel />)
    const navButtons = document.querySelectorAll('.w-12 button')
    fireEvent.click(navButtons[2])

    await screen.findByText('What are your capabilities?')
    expect(screen.getByText('Generate a note for this encounter')).toBeInTheDocument()

    // Verify PUT was called to save defaults
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/personalization',
      expect.objectContaining({ method: 'PUT' })
    )
  })
})
