import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EncounterRecorder } from '@/components/EncounterRecorder'

// Mock WebSocket
let mockWebSocketInstance: MockWebSocket | null = null
class MockWebSocket {
  static OPEN = 1
  readyState = MockWebSocket.OPEN
  binaryType = ''
  onmessage: ((event: { data: string }) => void) | null = null
  send = vi.fn()
  close = vi.fn()
  constructor() {
    mockWebSocketInstance = this
  }
}

// Mock AudioContext and related APIs
const mockAudioWorkletNode = {
  port: { onmessage: null as ((e: { data: ArrayBuffer }) => void) | null },
  connect: vi.fn(),
}

const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
  audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) },
  close: vi.fn(),
  state: 'running',
}

const mockMediaStream = {
  getTracks: () => [{ stop: vi.fn() }],
}

vi.stubGlobal('WebSocket', MockWebSocket)
vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext))
vi.stubGlobal('AudioWorkletNode', vi.fn(() => mockAudioWorkletNode))
vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock') })

const mockGetUserMedia = vi.fn().mockResolvedValue(mockMediaStream)
Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
})

describe('EncounterRecorder', () => {
  const onTranscriptionComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockAudioContext.state = 'running'
    mockWebSocketInstance = null
  })

  it('renders with initial ready state', () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    expect(screen.getByText('Transcribe')).toBeInTheDocument()
    expect(screen.getByText('Ready to record')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Live transcription will appear here...')).toBeInTheDocument()
  })

  it('has play button enabled initially', () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const buttons = screen.getAllByRole('button')
    const playButton = buttons[0]
    expect(playButton).not.toBeDisabled()
  })

  it('has clear button disabled when no transcription', () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const buttons = screen.getAllByRole('button')
    const clearButton = buttons[1]
    expect(clearButton).toBeDisabled()
  })

  it('has submit button disabled when no transcription', () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const buttons = screen.getAllByRole('button')
    const submitButton = buttons[2]
    expect(submitButton).toBeDisabled()
  })

  it('starts recording when play button clicked', async () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const buttons = screen.getAllByRole('button')
    const playButton = buttons[0]
    
    fireEvent.click(playButton)
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    })
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })
  })

  it('requests microphone access when starting recording', async () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const buttons = screen.getAllByRole('button')
    await fireEvent.click(buttons[0])
    
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it('creates AudioContext when starting recording', async () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const buttons = screen.getAllByRole('button')
    await fireEvent.click(buttons[0])
    
    expect(AudioContext).toHaveBeenCalled()
  })

  it('opens WebSocket connection when starting recording', async () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const buttons = screen.getAllByRole('button')
    await fireEvent.click(buttons[0])
    
    expect(mockWebSocketInstance).not.toBeNull()
  })

  it('shows textarea for live transcription', () => {
    render(<EncounterRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const textarea = screen.getByPlaceholderText('Live transcription will appear here...')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('readonly')
  })
})
