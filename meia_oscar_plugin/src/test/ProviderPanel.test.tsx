import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('shows quick actions when available', () => {
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
    expect(screen.getByText('What are your capabilities?')).toBeInTheDocument()
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

  it('switches to personalization view', () => {
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
    expect(screen.getByText('Quick actions')).toBeInTheDocument()
  })

  it('shows provider and encounter quick actions in personalization view', () => {
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
    
    expect(screen.getByText('Provider view')).toBeInTheDocument()
    expect(screen.getByText('Encounter view')).toBeInTheDocument()
    expect(screen.getByText('What are your capabilities?')).toBeInTheDocument()
    expect(screen.getByText('Generate a note for this encounter')).toBeInTheDocument()
  })

  it('shows custom prompts section in personalization view', () => {
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
    
    expect(screen.getByText('Custom prompts')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter custom instructions...')).toBeInTheDocument()
  })
})
