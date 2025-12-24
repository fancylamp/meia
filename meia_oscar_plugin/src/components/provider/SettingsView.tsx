import { Button } from "@/components/ui/button"
import { SignOut } from "@phosphor-icons/react"

interface SettingsViewProps {
  sessionId: string | null
  logout: () => void
}

export function SettingsView({ sessionId, logout }: SettingsViewProps) {
  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-muted-foreground">Session: {sessionId?.slice(0, 8)}...</p>
      <Button variant="destructive" onClick={logout} className="w-full">
        <SignOut className="mr-2" /> Disconnect
      </Button>
    </div>
  )
}
