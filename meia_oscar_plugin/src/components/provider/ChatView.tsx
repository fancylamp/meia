import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PaperPlaneTilt, SpinnerGapIcon, Paperclip, X, Plus, Copy, Check } from "@phosphor-icons/react"
import Markdown from "react-markdown"

type Attachment = { name: string; type: string; data: string }
type Message = { id?: string; text: string; isUser: boolean; isStatus?: boolean; isStreaming?: boolean }

const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/html", "text/plain", "text/markdown", "application/msword",
  "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/x-flv", "video/mpeg", "video/x-ms-wmv", "video/3gpp"
]

interface ChatViewProps {
  tabs: string[]
  activeTabId: string | null
  messages: Message[]
  sending: boolean
  loading: boolean
  suggestedActions: string[]
  quickActions: { text: string; enabled: boolean }[]
  createTab: () => void
  deleteTab: (id: string) => void
  switchTab: (id: string) => void
  addMessageToTab: (tabId: string, msg: Message) => void
  setSuggestedActions: (actions: string[]) => void
  sendToChat: (text: string, files: Attachment[]) => Promise<void>
}

export function ChatView({
  tabs, activeTabId, messages, sending, loading, suggestedActions, quickActions,
  createTab, deleteTab, switchTab, addMessageToTab, setSuggestedActions, sendToChat
}: ChatViewProps) {
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

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

  const sendMessage = async () => {
    if (!input.trim() && !attachments.length) return
    const text = input.trim()
    const files = [...attachments]
    setInput("")
    setAttachments([])
    await sendToChat(text, files)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, messages[messages.length - 1]?.text])

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 ${dragOver ? "ring-2 ring-primary ring-inset" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
    >
      <div className="flex items-center border-b px-1 gap-1 overflow-x-auto">
        {tabs.map((tabId) => (
          <div key={tabId} className={`flex items-center gap-1 px-2 py-1 text-xs rounded-t shrink-0 cursor-pointer ${tabId === activeTabId ? "bg-muted" : "hover:bg-accent"}`}>
            <span onClick={() => switchTab(tabId)}>Tab</span>
            {tabs.length > 1 && <X size={12} className="hover:text-destructive cursor-pointer" onClick={() => deleteTab(tabId)} />}
          </div>
        ))}
        {tabs.length < 6 && <button onClick={createTab} className="p-1 hover:bg-accent rounded shrink-0"><Plus size={14} /></button>}
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><SpinnerGapIcon size={24} className="animate-spin" /></div>
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
        {(suggestedActions.length > 0 || quickActions.filter(a => a.enabled).length > 0) && (
          <div className="flex flex-wrap gap-1">
            {suggestedActions.map((a, i) => (
              <button key={`s-${i}`} onClick={() => { setSuggestedActions([]); sendToChat(a, []) }} disabled={sending} className="text-xs bg-muted hover:bg-accent px-2 py-1 rounded">{a}</button>
            ))}
            {quickActions.filter(a => a.enabled).map((a, i) => (
              <button key={i} onClick={() => { setSuggestedActions([]); sendToChat(a.text, []) }} disabled={sending} className="text-xs bg-muted hover:bg-accent px-2 py-1 rounded">{a.text}</button>
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
          <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={sending}><Paperclip size={18} /></Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={dragOver ? "Drop files here..." : "Type a message..."}
            disabled={sending}
            rows={1}
            className="min-h-0 max-h-32 py-2 resize-none overflow-y-auto"
          />
          <Button size="icon" onClick={sendMessage} disabled={!input.trim() && !attachments.length}><PaperPlaneTilt /></Button>
        </div>
      </div>
    </div>
  )
}
