import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContactHubView } from '@/components/provider/ContactHubView'

vi.mock('@/hooks/useAuth', () => ({
  BACKEND_URL: 'http://localhost:8000',
}))

describe('ContactHubView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetching', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    render(<ContactHubView sessionId="test-session" />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows phone number when enrolled', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: '+15551234567', instructions: '' }),
    } as Response)

    render(<ContactHubView sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('+15551234567')).toBeInTheDocument()
    })
  })

  it('shows Enroll button when not enrolled', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: null, instructions: '' }),
    } as Response)

    render(<ContactHubView sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enroll/i })).toBeInTheDocument()
    })
  })

  it('calls enroll endpoint when Enroll clicked', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: null, instructions: '' }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: '+15559876543' }),
      } as Response)

    render(<ContactHubView sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enroll/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Enroll/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/contact-hub/enroll',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('renders instructions textarea', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: null, instructions: 'Test instructions' }),
    } as Response)

    render(<ContactHubView sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test instructions')).toBeInTheDocument()
    })
  })

  it('enables save button when instructions changed', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ phone_number: null, instructions: '' }),
    } as Response)

    render(<ContactHubView sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled()
    })

    const textarea = screen.getByPlaceholderText(/custom instructions/i)
    fireEvent.change(textarea, { target: { value: 'New instructions' } })

    expect(screen.getByRole('button', { name: /Save/i })).not.toBeDisabled()
  })

  it('calls save endpoint when Save clicked', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: null, instructions: '' }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      } as Response)

    render(<ContactHubView sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(/custom instructions/i)
    fireEvent.change(textarea, { target: { value: 'New instructions' } })
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/contact-hub/instructions',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ session_id: 'test-session', instructions: 'New instructions' }),
        })
      )
    })
  })

  it('calls delete endpoint when delete clicked and confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ phone_number: '+15551234567', instructions: '' }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      } as Response)

    render(<ContactHubView sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('+15551234567')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByRole('button', { name: '' })
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/contact-hub/phone',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})
