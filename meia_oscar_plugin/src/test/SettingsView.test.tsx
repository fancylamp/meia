import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsView } from '@/components/provider/SettingsView'

vi.mock('@/hooks/useAuth', () => ({
  BACKEND_URL: 'http://localhost:8000',
}))

describe('SettingsView', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetching contact hub', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})) // Never resolves
    render(<SettingsView sessionId="test-session" logout={mockLogout} />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows phone number when enrolled', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: '+15551234567', fax_number: null }),
    } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('+15551234567')).toBeInTheDocument()
    })
  })

  it('shows Enroll button when not enrolled', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: null, fax_number: null }),
    } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enroll/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue('Not enrolled')).toBeInTheDocument()
    })
  })

  it('calls enroll endpoint when Enroll clicked', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: null, fax_number: null }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: '+15559876543', fax_number: null }),
      } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enroll/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Enroll/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/contact-hub/enroll',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ session_id: 'test-session' }),
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('+15559876543')).toBeInTheDocument()
    })
  })

  it('shows fax number as coming soon', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: null, fax_number: null }),
    } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Coming soon')).toBeInTheDocument()
    })
  })

  it('shows session ID truncated', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: null, fax_number: null }),
    } as Response)

    render(<SettingsView sessionId="test-session-12345" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByText(/Session: test-ses\.\.\./)).toBeInTheDocument()
    })
  })

  it('calls logout when Disconnect clicked', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: null, fax_number: null }),
    } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Disconnect/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Disconnect/i }))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('shows delete button when enrolled', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: '+15551234567', fax_number: null }),
    } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument() // Trash icon button
    })
  })

  it('calls delete endpoint when delete clicked and confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: '+15551234567', fax_number: null }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: null, fax_number: null }),
      } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('+15551234567')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByRole('button', { name: '' })
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/contact-hub/phone',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ session_id: 'test-session', phone_number: '+15551234567' }),
        })
      )
    })
  })

  it('does not call delete endpoint when confirm cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: '+15551234567', fax_number: null }),
    } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('+15551234567')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByRole('button', { name: '' })
    fireEvent.click(deleteBtn)

    expect(fetch).toHaveBeenCalledTimes(1) // Only initial fetch
  })

  it('disables Enroll button while enrolling', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: null, fax_number: null }),
      } as Response)
      .mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enroll/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Enroll/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enroll/i })).toBeDisabled()
    })
  })

  it('renders Contact Hub and Session cards', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: null, fax_number: null }),
    } as Response)

    render(<SettingsView sessionId="test-session" logout={mockLogout} />)

    await waitFor(() => {
      expect(screen.getByText('Contact Hub')).toBeInTheDocument()
      expect(screen.getByText('Session')).toBeInTheDocument()
    })
  })
})
