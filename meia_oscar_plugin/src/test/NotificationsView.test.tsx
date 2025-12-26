import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationsView } from '@/components/provider/NotificationsView'

describe('NotificationsView', () => {
  it('renders mock notifications', () => {
    render(<NotificationsView />)
    expect(screen.getByText('New Feature')).toBeInTheDocument()
    expect(screen.getByText('System Update')).toBeInTheDocument()
    expect(screen.getByText('Reminder')).toBeInTheDocument()
  })

  it('dismisses notification when X clicked', () => {
    render(<NotificationsView />)
    const dismissButtons = screen.getAllByRole('button')
    fireEvent.click(dismissButtons[0])
    expect(screen.queryByText('New Feature')).not.toBeInTheDocument()
    expect(screen.getByText('System Update')).toBeInTheDocument()
  })

  it('shows empty state when all dismissed', () => {
    render(<NotificationsView />)
    const dismissButtons = screen.getAllByRole('button')
    dismissButtons.forEach(btn => fireEvent.click(btn))
    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })
})
