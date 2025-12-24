import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SignOut, Phone, SpinnerGap, Trash } from "@phosphor-icons/react"
import { BACKEND_URL } from "@/hooks/useAuth"

interface SettingsViewProps {
  sessionId: string | null
  logout: () => void
}

export function SettingsView({ sessionId, logout }: SettingsViewProps) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    fetch(`${BACKEND_URL}/contact-hub?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => setPhoneNumber(data.phone_number))
      .finally(() => setLoading(false))
  }, [sessionId])

  const handleEnroll = async () => {
    setEnrolling(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/contact-hub/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else if (data.phone_number) setPhoneNumber(data.phone_number)
    } catch (e) {
      setError("Failed to enroll")
    }
    setEnrolling(false)
  }

  const handleDelete = async () => {
    if (!confirm("Release this phone number? This cannot be undone.")) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/contact-hub/phone`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, phone_number: phoneNumber })
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setPhoneNumber(null)
    } catch (e) {
      setError("Failed to delete")
    }
    setDeleting(false)
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <Card size="sm">
        <CardHeader><CardTitle className="font-semibold">Contact Hub</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
            <div className="flex gap-2 items-center">
              {loading ? (
                <SpinnerGap className="animate-spin" size={16} />
              ) : phoneNumber ? (
                <>
                  <Input value={phoneNumber} readOnly className="flex-1" />
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <SpinnerGap className="animate-spin" size={14} /> : <Trash size={14} />}
                  </Button>
                </>
              ) : (
                <>
                  <Input value="Not enrolled" readOnly disabled className="flex-1" />
                  <Button size="sm" onClick={handleEnroll} disabled={enrolling}>
                    {enrolling ? <SpinnerGap className="animate-spin mr-1" size={14} /> : <Phone className="mr-1" size={14} />}
                    Enroll
                  </Button>
                </>
              )}
            </div>
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Fax Number</p>
            <Input value="Coming soon" readOnly disabled />
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader><CardTitle className="font-semibold">Session</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Session: {sessionId?.slice(0, 8)}...</p>
          <Button variant="destructive" onClick={logout} className="w-full">
            <SignOut className="mr-2" /> Disconnect
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
