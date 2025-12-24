import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EncounterPanel } from '@/components/EncounterPanel'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
  BACKEND_URL: 'http://localhost:8000',
}))

vi.mock('@/hooks/useEncounterChat', () => ({
  useEncounterChat: vi.fn(),
}))

vi.mock('@/components/EncounterRecorder', () => ({
  EncounterRecorder: ({ onTranscriptionComplete }: { onTranscriptionComplete: (text: string) => void }) => (
    <button data-testid="mock-recorder" onClick={() => onTranscriptionComplete('Test transcription')}>
      Record
    </button>
  ),
}))

import { useAuth } from '@/hooks/useAuth'
import { useEncounterChat } from '@/hooks/useEncounterChat'

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockUseEncounterChat = useEncounterChat as ReturnType<typeof vi.fn>

describe('EncounterPanel', () => {
  const defaultChatMock = {
    messages: [],
    sending: false,
    suggestedActions: [],
    sendMessage: vi.fn(),
    addMessage: vi.fn(),
    setSuggestedActions: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockResolvedValue({ json: () => Promise.resolve({}) } as Response)
    Object.defineProperty(window, 'location', {
      value: { search: '?demographicNo=123&providerNo=456&appointmentNo=789&reason=checkup&appointmentDate=2024-01-01&start_time=10:00' },
      writable: true,
    })
  })

  it('shows loading spinner when loading', () => {
    mockUseAuth.mockReturnValue({ sessionId: null, isLoading: true })
    mockUseEncounterChat.mockReturnValue(defaultChatMock)

    render(<EncounterPanel />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders encounter panel when loaded', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue(defaultChatMock)

    render(<EncounterPanel />)
    expect(screen.getByText('Encounter')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })

  it('renders messages correctly', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({
      ...defaultChatMock,
      messages: [
        { text: 'User message', isUser: true },
        { text: 'Assistant response', isUser: false },
        { text: 'Status update', isUser: false, isStatus: true },
      ],
    })

    render(<EncounterPanel />)
    expect(screen.getByText('User message')).toBeInTheDocument()
    expect(screen.getByText('Assistant response')).toBeInTheDocument()
    expect(screen.getByText('Status update')).toBeInTheDocument()
  })

  it('disables send button when input is empty and no attachments', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue(defaultChatMock)

    render(<EncounterPanel />)
    const buttons = screen.getAllByRole('button')
    const lastButton = buttons[buttons.length - 1]
    expect(lastButton).toBeDisabled()
  })

  it('enables send button when input has text', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue(defaultChatMock)

    render(<EncounterPanel />)
    const textarea = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(textarea, { target: { value: 'Hello' } })

    const sendButtons = screen.getAllByRole('button')
    const sendButton = sendButtons[sendButtons.length - 1]
    expect(sendButton).not.toBeDisabled()
  })

  it('calls sendMessage when send button clicked', () => {
    const sendMessageFn = vi.fn()
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({ ...defaultChatMock, sendMessage: sendMessageFn })

    render(<EncounterPanel />)
    const textarea = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(textarea, { target: { value: 'Test message' } })

    const sendButtons = screen.getAllByRole('button')
    const sendButton = sendButtons[sendButtons.length - 1]
    fireEvent.click(sendButton)

    expect(sendMessageFn).toHaveBeenCalledWith('Test message', undefined, undefined)
  })

  it('shows quick actions', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue(defaultChatMock)

    render(<EncounterPanel />)
    expect(screen.getByText('Generate a note for this encounter')).toBeInTheDocument()
  })

  it('shows suggested actions when available', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({
      ...defaultChatMock,
      suggestedActions: ['Action 1', 'Action 2'],
    })

    render(<EncounterPanel />)
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
  })

  it('handles transcription from recorder', () => {
    const addMessageFn = vi.fn()
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({ ...defaultChatMock, addMessage: addMessageFn })

    render(<EncounterPanel />)
    fireEvent.click(screen.getByTestId('mock-recorder'))

    expect(addMessageFn).toHaveBeenCalledWith({
      text: 'Transcription:\n\nTest transcription',
      isUser: false,
      isStatus: true,
    })
  })

  it('shows sending spinner when sending', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({ ...defaultChatMock, sending: true })

    render(<EncounterPanel />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('sends Enter key to submit message', () => {
    const sendMessageFn = vi.fn()
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({ ...defaultChatMock, sendMessage: sendMessageFn })

    render(<EncounterPanel />)
    const textarea = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(textarea, { target: { value: 'Test' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(sendMessageFn).toHaveBeenCalled()
  })

  it('does not submit on Shift+Enter', () => {
    const sendMessageFn = vi.fn()
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({ ...defaultChatMock, sendMessage: sendMessageFn })

    render(<EncounterPanel />)
    const textarea = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(textarea, { target: { value: 'Test' } })
    
    // Clear any calls from initial render
    sendMessageFn.mockClear()
    
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(sendMessageFn).not.toHaveBeenCalled()
  })

  it('requests patient summary on initialization with session and patient context', () => {
    const sendMessageFn = vi.fn()
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({ ...defaultChatMock, sendMessage: sendMessageFn })

    render(<EncounterPanel />)

    expect(sendMessageFn).toHaveBeenCalledWith(
      expect.stringContaining('Provide a brief summary for this patient'),
      expect.stringContaining('[Encounter Context]'),
      undefined,
      true // hidden flag
    )
  })

  it('includes patient context in summary request', () => {
    const sendMessageFn = vi.fn()
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({ ...defaultChatMock, sendMessage: sendMessageFn })

    render(<EncounterPanel />)

    const contextArg = sendMessageFn.mock.calls[0][1]
    expect(contextArg).toContain('Patient ID: 123')
    expect(contextArg).toContain('Provider ID: 456')
    expect(contextArg).toContain('Appointment ID: 789')
    expect(contextArg).toContain('Reason: checkup')
  })

  it('does not request summary when no session', () => {
    const sendMessageFn = vi.fn()
    mockUseAuth.mockReturnValue({ sessionId: null, isLoading: false })
    mockUseEncounterChat.mockReturnValue({ ...defaultChatMock, sendMessage: sendMessageFn })

    render(<EncounterPanel />)

    expect(sendMessageFn).not.toHaveBeenCalled()
  })

  it('hides QUICK_ACTIONS metadata from rendered messages', () => {
    mockUseAuth.mockReturnValue({ sessionId: 'test-session', isLoading: false })
    mockUseEncounterChat.mockReturnValue({
      ...defaultChatMock,
      messages: [
        { text: 'Here is your response [QUICK_ACTIONS: "Action 1", "Action 2"]', isUser: false },
      ],
    })

    render(<EncounterPanel />)
    expect(screen.getByText('Here is your response')).toBeInTheDocument()
    expect(screen.queryByText(/QUICK_ACTIONS/)).not.toBeInTheDocument()
  })
})
