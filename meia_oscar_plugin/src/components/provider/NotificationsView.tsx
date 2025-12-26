import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "@phosphor-icons/react"

const MOCK_NOTIFICATIONS = [
  { id: "1", title: "New Feature", message: "Contact Hub is now available! Set up your phone number to receive patient calls.", time: "2 hours ago" },
  { id: "2", title: "System Update", message: "Meia has been updated with improved appointment scheduling.", time: "1 day ago" },
  { id: "3", title: "Reminder", message: "Don't forget to customize your quick actions in the Personalization view.", time: "3 days ago" },
]

export function NotificationsView() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)

  const dismiss = (id: string) => setNotifications(n => n.filter(x => x.id !== id))

  return (
    <div className="p-4 space-y-3 overflow-y-auto flex-1">
      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
      ) : (
        notifications.map(n => (
          <Card key={n.id} size="sm">
            <CardContent className="pt-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">{n.time}</p>
                </div>
                <button onClick={() => dismiss(n.id)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
