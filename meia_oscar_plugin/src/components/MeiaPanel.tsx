import { useState, useRef, useEffect } from "react"
import { useAuth, BACKEND_URL } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChatCircle, Gear, SignOut, PaperPlaneTilt, SpinnerGapIcon, Paperclip, X } from "@phosphor-icons/react"
import Markdown from "react-markdown"

type Message = { text: string; isUser: boolean; isStatus?: boolean }
type Attachment = { name: string; type: string; data: string }

export function MeiaPanel() {
  const { sessionId, isAuthenticated, isLoading, error, login, logout } = useAuth()
  const [view, setView] = useState<"chat" | "settings">("chat")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_TYPES = [
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/html", "text/plain", "text/markdown", "application/msword",
    "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/x-flv", "video/mpeg", "video/x-ms-wmv", "video/3gpp"
  ]
  
  const addStatusMessage = (text: string) => {
    setMessages((m) => [...m, { text, isUser: false, isStatus: true }])
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        addStatusMessage(`Unsupported file type: ${file.name}`)
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
    if ((!text.trim() && !files.length) || !sessionId) return
    const displayText = files.length ? `${text} [${files.map((f) => f.name).join(", ")}]` : text
    setMessages((m) => [...m, { text: displayText, isUser: true }])
    setSending(true)
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text, attachments: files.length ? files : undefined }),
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
              setMessages((m) => [...m, { text: event.description, isUser: false, isStatus: true }])
            } else if (event.type === "response") {
              setMessages((m) => [...m, { text: event.text, isUser: false }])
            }
          } catch {}
        }
      }
    } catch {
      addStatusMessage("An unexpected error occurred, please try again.")
    }
    setSending(false)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if ((!input.trim() && !attachments.length) || sending) return
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
      <div className="fixed top-0 right-0 w-[25vw] h-screen bg-background border-l flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full h-full">
            <CardHeader className="text-center">
              <img src={chrome.runtime.getURL("logo.svg")} alt="Meia" className="w-64 mx-auto mb-5" />
              <CardTitle>Welcome to Meia</CardTitle>
              <CardDescription>Connect and authorize with your OSCAR credentials.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Button onClick={login} disabled={isLoading} className="w-full">
                {isLoading ? "Connecting..." : "Connect"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
        </div>
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
        <div className="p-3 border-b font-semibold">
          {view === "chat" ? "Chat" : "Settings"}
        </div>
        {view === "chat" ? (
          <>
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 text-sm break-words overflow-hidden ${m.isUser ? "bg-primary text-primary-foreground py-2" : m.isStatus ? "text-muted-foreground/60 italic font-light py-0.5" : "bg-muted py-2 prose prose-sm dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:max-w-full"}`}>
                    {m.isUser || m.isStatus ? m.text : <Markdown>{m.text}</Markdown>}
                  </div>
                </div>
              ))}
              { sending && 
                <div className="flex justify-start ml-2"><SpinnerGapIcon size={20} className="animate-spin" /></div>
              }
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t space-y-2">
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
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={dragOver ? "Drop files here..." : "Type a message..."}
                  disabled={sending}
                />
                <Button size="icon" onClick={sendMessage} disabled={sending && !attachments.length}>
                  <PaperPlaneTilt />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">Session: {sessionId?.slice(0, 8)}...</p>
            <Button variant="destructive" onClick={logout} className="w-full">
              <SignOut className="mr-2" /> Disconnect
            </Button>
          </div>
        )}
      </div>
      <div className="w-12 border-l flex flex-col">
        <button onClick={() => setView("chat")} className={`h-12 flex items-center justify-center ${view === "chat" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
          <ChatCircle size={20} />
        </button>
        <button onClick={() => setView("settings")} className={`h-12 flex items-center justify-center ${view === "settings" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
          <Gear size={20} />
        </button>
      </div>
    </div>
  )
}
