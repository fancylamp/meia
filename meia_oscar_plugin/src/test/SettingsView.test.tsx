import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsView } from '@/components/provider/SettingsView'

describe('SettingsView', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows session ID truncated', () => {
    render(<SettingsView sessionId="test-session-12345" logout={mockLogout} />)
    expect(screen.getByText(/Session: test-ses\.\.\./)).toBeInTheDocument()
  })

  it('calls logout when Disconnect clicked', () => {
    render(<SettingsView sessionId="test-session" logout={mockLogout} />)
    fireEvent.click(screen.getByRole('button', { name: /Disconnect/i }))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('renders Session card', () => {
    render(<SettingsView sessionId="test-session" logout={mockLogout} />)
    expect(screen.getByText('Session')).toBeInTheDocument()
  })
})
