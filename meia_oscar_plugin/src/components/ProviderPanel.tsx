import { useState, useEffect } from "react"
import { useAuth, BACKEND_URL } from "@/hooks/useAuth"
import { useChatSessions } from "@/hooks/useChatSessions"
import { Button } from "@/components/ui/button"
import { ChatCircle, Gear, SpinnerGapIcon, User } from "@phosphor-icons/react"
import { ChatView } from "./provider/ChatView"
import { SettingsView } from "./provider/SettingsView"
import { PersonalizationView } from "./provider/PersonalizationView"

type Attachment = { name: string; type: string; data: string }

export function ProviderPanel() {
  const { sessionId, isAuthenticated, isLoading, error, login, logout } = useAuth()
  const { tabs, activeTabId, messages, sending, loading, suggestedActions, createTab, deleteTab, switchTab, addMessageToTab, setTabSending, setSuggestedActions } = useChatSessions(sessionId, isAuthenticated)
  const [view, setView] = useState<"chat" | "settings" | "personalization">("chat")
  const [quickActions, setQuickActions] = useState<{text: string, enabled: boolean}[]>([{ text: "What are your capabilities?", enabled: true }, { text: "Create a new patient", enabled: true }])
  const [encounterQuickActions, setEncounterQuickActions] = useState<{text: string, enabled: boolean}[]>([{ text: "Generate a note for this encounter", enabled: true }])
  const [customPrompt, setCustomPrompt] = useState("")
  const [savedCustomPrompt, setSavedCustomPrompt] = useState("")

  useEffect(() => {
    if (!sessionId || !isAuthenticated) return
    fetch(`${BACKEND_URL}/personalization?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.quick_actions) setQuickActions(data.quick_actions)
        if (data.encounter_quick_actions) setEncounterQuickActions(data.encounter_quick_actions)
        if (data.custom_prompt !== undefined) {
          setCustomPrompt(data.custom_prompt)
          setSavedCustomPrompt(data.custom_prompt)
        }
      })
      .catch(console.error)
  }, [sessionId, isAuthenticated])

  const savePersonalization = (actions: typeof quickActions, encounterActions: typeof encounterQuickActions, prompt: string) => {
    fetch(`${BACKEND_URL}/personalization`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, quick_actions: actions, encounter_quick_actions: encounterActions, custom_prompt: prompt })
    })
  }

  const sendToChat = async (text: string, files: Attachment[]) => {
    if ((!text.trim() && !files.length) || !sessionId || !activeTabId) return
    const targetTabId = activeTabId
    const displayText = files.length ? `${text} [${files.map((f) => f.name).join(", ")}]` : text
    addMessageToTab(targetTabId, { text: displayText, isUser: true })
    setTabSending(targetTabId, true)
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, chat_session_id: targetTabId, message: text, attachments: files.length ? files : undefined }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "tool_call") {
              addMessageToTab(targetTabId, { text: event.description, isUser: false, isStatus: true })
            } else if (event.type === "response") {
              addMessageToTab(targetTabId, { text: event.text, isUser: false })
              if (event.suggested_actions?.length) setSuggestedActions(event.suggested_actions)
            }
          } catch {}
        }
      }
    } catch {
      addMessageToTab(targetTabId, { text: "An unexpected error occurred, please try again.", isUser: false, isStatus: true })
    }
    setTabSending(targetTabId, false)
  }

  if (isLoading && !isAuthenticated) {
    return (
      <div className="fixed top-0 right-0 w-[25vw] h-screen bg-background border-l flex items-center justify-center">
        <SpinnerGapIcon size={32} className="animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed top-0 right-0 w-[25vw] h-screen bg-background border-l flex flex-col items-center justify-center p-4">
        <img src={chrome.runtime.getURL("logo.svg")} alt="Meia" className="w-64 mb-5" />
        <h2 className="text-xl font-semibold">Welcome to Meia</h2>
        <p className="text-sm text-muted-foreground mb-4">Connect and authorize with your OSCAR credentials.</p>
        <Button onClick={login} disabled={isLoading} className="w-48">
          {isLoading ? "Connecting..." : "Connect"}
        </Button>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div className="fixed top-0 right-0 w-[25vw] h-screen bg-background border-l flex">
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b font-semibold flex items-center gap-2">
          <img src={chrome.runtime.getURL("icon.png")} alt="" className="w-5 h-5" />
          {view === "chat" ? "Chat" : view === "settings" ? "Settings" : "Personalization"}
        </div>
        {view === "chat" ? (
          <ChatView
            tabs={tabs}
            activeTabId={activeTabId}
            messages={messages}
            sending={sending}
            loading={loading}
            suggestedActions={suggestedActions}
            quickActions={quickActions}
            createTab={createTab}
            deleteTab={deleteTab}
            switchTab={switchTab}
            addMessageToTab={addMessageToTab}
            setSuggestedActions={setSuggestedActions}
            sendToChat={sendToChat}
          />
        ) : view === "settings" ? (
          <SettingsView sessionId={sessionId} logout={logout} />
        ) : (
          <PersonalizationView
            quickActions={quickActions}
            encounterQuickActions={encounterQuickActions}
            customPrompt={customPrompt}
            savedCustomPrompt={savedCustomPrompt}
            setQuickActions={setQuickActions}
            setEncounterQuickActions={setEncounterQuickActions}
            setCustomPrompt={setCustomPrompt}
            setSavedCustomPrompt={setSavedCustomPrompt}
            savePersonalization={savePersonalization}
          />
        )}
      </div>
      <div className="w-12 border-l flex flex-col">
        <button onClick={() => setView("chat")} className={`h-12 flex items-center justify-center ${view === "chat" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
          <ChatCircle size={20} />
        </button>
        <button onClick={() => setView("personalization")} className={`h-12 flex items-center justify-center ${view === "personalization" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
          <User size={20} />
        </button>
        <button onClick={() => setView("settings")} className={`h-12 flex items-center justify-center ${view === "settings" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
          <Gear size={20} />
        </button>
      </div>
    </div>
  )
}
