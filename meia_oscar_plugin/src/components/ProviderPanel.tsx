import { useState, useRef, useEffect } from "react"
import { useAuth, BACKEND_URL } from "@/hooks/useAuth"
import { useChatSessions } from "@/hooks/useChatSessions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Item, ItemGroup, ItemContent, ItemTitle, ItemActions } from "@/components/ui/item"
import { Checkbox } from "@/components/ui/checkbox"
import { ChatCircle, Gear, SignOut, PaperPlaneTilt, SpinnerGapIcon, Paperclip, X, Plus, Copy, Check, User } from "@phosphor-icons/react"
import Markdown from "react-markdown"

type Attachment = { name: string; type: string; data: string }

export function ProviderPanel() {
  const { sessionId, isAuthenticated, isLoading, error, login, logout } = useAuth()
  const { tabs, activeTabId, messages, sending, loading, createTab, deleteTab, switchTab, addMessageToTab, setTabSending } = useChatSessions(sessionId, isAuthenticated)
  const [view, setView] = useState<"chat" | "settings" | "personalization">("chat")
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [quickActions, setQuickActions] = useState<{text: string, enabled: boolean}[]>([{ text: "What are your capabilities?", enabled: true }, { text: "Create a new patient", enabled: true }])
  const [encounterQuickActions, setEncounterQuickActions] = useState<{text: string, enabled: boolean}[]>([{ text: "Generate a note for this encounter", enabled: true }])
  const [encounterEditingIndex, setEncounterEditingIndex] = useState<number | null>(null)
  const [encounterEditText, setEncounterEditText] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [savedCustomPrompt, setSavedCustomPrompt] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  const ALLOWED_TYPES = [
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/html", "text/plain", "text/markdown", "application/msword",
    "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/x-flv", "video/mpeg", "video/x-ms-wmv", "video/3gpp"
  ]

  const handleFiles = (files: FileList | null) => {
    if (!files || !activeTabId) return
    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        addMessageToTab(activeTabId, { text: `Unsupported file type: ${file.name}`, isUser: false, isStatus: true })
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1]
        setAttachments((a) => [...a, { name: file.name, type: file.type, data: base64 }])
      }
      reader.readAsDataURL(file)
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
            }
          } catch {}
        }
      }
    } catch {
      addMessageToTab(targetTabId, { text: "An unexpected error occurred, please try again.", isUser: false, isStatus: true })
    }
    setTabSending(targetTabId, false)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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

  const sendMessage = async () => {
    if (!input.trim() && !attachments.length) return
    const text = input.trim()
    const files = [...attachments]
    setInput("")
    setAttachments([])
    await sendToChat(text, files)
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
    <div
      className={`fixed top-0 right-0 w-[25vw] h-screen bg-background border-l flex ${dragOver ? "ring-2 ring-primary ring-inset" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
    >
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b font-semibold flex items-center gap-2">
          <img src={chrome.runtime.getURL("icon.png")} alt="" className="w-5 h-5" />
          {view === "chat" ? "Chat" : view === "settings" ? "Settings" : "Personalization"}
        </div>
        {view === "chat" ? (
          <>
            <div className="flex items-center border-b px-1 gap-1 overflow-x-auto">
              {tabs.map((tabId) => (
                <div
                  key={tabId}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-t shrink-0 cursor-pointer ${tabId === activeTabId ? "bg-muted" : "hover:bg-accent"}`}
                >
                  <span onClick={() => switchTab(tabId)}>Tab</span>
                  {tabs.length > 1 && (
                    <X size={12} className="hover:text-destructive cursor-pointer" onClick={() => deleteTab(tabId)} />
                  )}
                </div>
              ))}
              {tabs.length < 6 && (
                <button onClick={createTab} className="p-1 hover:bg-accent rounded shrink-0">
                  <Plus size={14} />
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <SpinnerGapIcon size={24} className="animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`${m.isUser ? "flex justify-end" : ""} group`}>
                    <div className={`max-w-[80%] rounded-lg px-3 text-sm break-words overflow-hidden ${m.isUser ? "bg-primary text-primary-foreground py-2" : m.isStatus ? "text-muted-foreground/60 italic font-light py-0.5" : "bg-muted py-2 prose prose-sm dark:prose-invert [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_code]:break-all [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800 dark:[&_a]:text-blue-400"}`}>
                      {m.isUser || m.isStatus ? m.text : <Markdown>{m.text}</Markdown>}
                    </div>
                    {!m.isUser && !m.isStatus && (
                      <button onClick={() => copyToClipboard(m.text, i)} className="mt-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition-opacity flex items-center gap-1 text-xs text-muted-foreground">
                        {copiedIdx === i ? <><Check size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                    )}
                  </div>
                ))}
                {sending && <div className="flex justify-start ml-2"><SpinnerGapIcon size={20} className="animate-spin" /></div>}
                <div ref={messagesEndRef} />
              </div>
            )}
            <div className="p-3 border-t space-y-2">
              {quickActions.filter(a => a.enabled).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {quickActions.filter(a => a.enabled).map((a, i) => (
                    <button key={i} onClick={() => sendToChat(a.text, [])} disabled={sending} className="text-xs bg-muted hover:bg-accent px-2 py-1 rounded">{a.text}</button>
                  ))}
                </div>
              )}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {attachments.map((a, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                      {a.name}
                      <button onClick={() => setAttachments((att) => att.filter((_, j) => j !== i))}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" className="hidden" multiple accept={ALLOWED_TYPES.join(",")} onChange={(e) => handleFiles(e.target.files)} />
                <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={sending}>
                  <Paperclip size={18} />
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder={dragOver ? "Drop files here..." : "Type a message..."}
                  disabled={sending}
                  rows={1}
                  className="min-h-0 max-h-32 py-2 resize-none overflow-y-auto"
                />
                <Button size="icon" onClick={sendMessage} disabled={!input.trim() && !attachments.length}>
                  <PaperPlaneTilt />
                </Button>
              </div>
            </div>
          </>
        ) : view === "settings" ? (
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">Session: {sessionId?.slice(0, 8)}...</p>
            <Button variant="destructive" onClick={logout} className="w-full">
              <SignOut className="mr-2" /> Disconnect
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <Card size="sm">
              <CardHeader><CardTitle className="font-semibold">Quick actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">Provider view</p>
                <ItemGroup className="gap-0">
                  {quickActions.map((action, i) => (
                    <Item key={i} size="xs">
                      <ItemContent><ItemTitle>{action.text}</ItemTitle></ItemContent>
                      <ItemActions>
                        <Checkbox checked={action.enabled} onCheckedChange={() => {
                          const updated = quickActions.map((item, j) => j === i ? { ...item, enabled: !item.enabled } : item)
                          setQuickActions(updated)
                          savePersonalization(updated, encounterQuickActions, customPrompt)
                        }} />
                        <button onClick={() => {
                          const updated = quickActions.filter((_, j) => j !== i)
                          setQuickActions(updated)
                          savePersonalization(updated, encounterQuickActions, customPrompt)
                        }} className="hover:text-destructive"><X size={14} /></button>
                      </ItemActions>
                    </Item>
                  ))}
                  {editingIndex === -1 && (
                    <Item size="xs">
                      <ItemContent>
                        <input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editText.trim()) {
                              const updated = [...quickActions, { text: editText.trim(), enabled: true }]
                              setQuickActions(updated)
                              savePersonalization(updated, encounterQuickActions, customPrompt)
                              setEditingIndex(null)
                              setEditText("")
                            } else if (e.key === "Escape") {
                              setEditingIndex(null)
                              setEditText("")
                            }
                          }}
                          className="flex-1 bg-transparent border-b border-input text-sm outline-none"
                          placeholder="Enter action text..."
                        />
                      </ItemContent>
                      <ItemActions>
                        <button onClick={() => {
                          if (editText.trim()) {
                            const updated = [...quickActions, { text: editText.trim(), enabled: true }]
                            setQuickActions(updated)
                            savePersonalization(updated, encounterQuickActions, customPrompt)
                          }
                          setEditingIndex(null)
                          setEditText("")
                        }} className="hover:text-green-500"><Check size={14} /></button>
                        <button onClick={() => { setEditingIndex(null); setEditText("") }} className="hover:text-destructive"><X size={14} /></button>
                      </ItemActions>
                    </Item>
                  )}
                </ItemGroup>
                <Button size="sm" variant="outline" disabled={editingIndex !== null} onClick={() => setEditingIndex(-1)}><Plus size={14} className="mr-1" />Add</Button>
                <p className="text-xs text-muted-foreground mt-4">Encounter view</p>
                <ItemGroup className="gap-0">
                  {encounterQuickActions.map((action, i) => (
                    <Item key={i} size="xs">
                      <ItemContent><ItemTitle>{action.text}</ItemTitle></ItemContent>
                      <ItemActions>
                        <Checkbox checked={action.enabled} onCheckedChange={() => {
                          const updated = encounterQuickActions.map((item, j) => j === i ? { ...item, enabled: !item.enabled } : item)
                          setEncounterQuickActions(updated)
                          savePersonalization(quickActions, updated, customPrompt)
                        }} />
                        <button onClick={() => {
                          const updated = encounterQuickActions.filter((_, j) => j !== i)
                          setEncounterQuickActions(updated)
                          savePersonalization(quickActions, updated, customPrompt)
                        }} className="hover:text-destructive"><X size={14} /></button>
                      </ItemActions>
                    </Item>
                  ))}
                  {encounterEditingIndex === -1 && (
                    <Item size="xs">
                      <ItemContent>
                        <input
                          autoFocus
                          value={encounterEditText}
                          onChange={(e) => setEncounterEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && encounterEditText.trim()) {
                              const updated = [...encounterQuickActions, { text: encounterEditText.trim(), enabled: true }]
                              setEncounterQuickActions(updated)
                              savePersonalization(quickActions, updated, customPrompt)
                              setEncounterEditingIndex(null)
                              setEncounterEditText("")
                            } else if (e.key === "Escape") {
                              setEncounterEditingIndex(null)
                              setEncounterEditText("")
                            }
                          }}
                          className="flex-1 bg-transparent border-b border-input text-sm outline-none"
                          placeholder="Enter action text..."
                        />
                      </ItemContent>
                      <ItemActions>
                        <button onClick={() => {
                          if (encounterEditText.trim()) {
                            const updated = [...encounterQuickActions, { text: encounterEditText.trim(), enabled: true }]
                            setEncounterQuickActions(updated)
                            savePersonalization(quickActions, updated, customPrompt)
                          }
                          setEncounterEditingIndex(null)
                          setEncounterEditText("")
                        }} className="hover:text-green-500"><Check size={14} /></button>
                        <button onClick={() => { setEncounterEditingIndex(null); setEncounterEditText("") }} className="hover:text-destructive"><X size={14} /></button>
                      </ItemActions>
                    </Item>
                  )}
                </ItemGroup>
                <Button size="sm" variant="outline" disabled={encounterEditingIndex !== null} onClick={() => setEncounterEditingIndex(-1)}><Plus size={14} className="mr-1" />Add</Button>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader><CardTitle className="font-semibold">Custom prompts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Enter custom instructions..." className="min-h-[240px]" />
                <Button size="sm" disabled={customPrompt === savedCustomPrompt} onClick={() => { savePersonalization(quickActions, encounterQuickActions, customPrompt); setSavedCustomPrompt(customPrompt) }}>Save</Button>
              </CardContent>
            </Card>
          </div>
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
