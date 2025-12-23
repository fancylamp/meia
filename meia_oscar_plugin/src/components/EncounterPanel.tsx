import { useState, useRef, useEffect, useMemo } from "react"
import { useAuth, BACKEND_URL } from "@/hooks/useAuth"
import { useEncounterChat, Attachment } from "@/hooks/useEncounterChat"
import { EncounterRecorder } from "./EncounterRecorder"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PaperPlaneTilt, SpinnerGap, Paperclip, X, Copy, Check } from "@phosphor-icons/react"
import Markdown from "react-markdown"

const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/html", "text/plain", "text/markdown", "application/msword",
  "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export function EncounterPanel() {
  const { sessionId, isLoading } = useAuth()
  const { messages, sending, sendMessage, addMessage } = useEncounterChat(sessionId)
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [transcription, setTranscription] = useState<string | null>(null)
  const contextSentRef = useRef(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [quickActions, setQuickActions] = useState<{text: string, enabled: boolean}[]>([{ text: "Generate a note for this encounter", enabled: true }])

  useEffect(() => {
    if (!sessionId) return
    fetch(`${BACKEND_URL}/personalization?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => { if (data.encounter_quick_actions) setQuickActions(data.encounter_quick_actions) })
      .catch(console.error)
  }, [sessionId])

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  const encounterContext = useMemo(() => {
    const p = new URLSearchParams(window.location.search)
    return {
      text: `[Encounter Context]
      Patient ID: ${p.get("demographicNo")}
      Provider ID: ${p.get("providerNo")}
      Appointment ID: ${p.get("appointmentNo")}
      Reason: ${p.get("reason")}
      Date: ${p.get("appointmentDate")}
      Time: ${p.get("start_time")}`,
      patientId: p.get("demographicNo"),
      reason: p.get("reason"),
    }
  }, [])

  // Request patient summary on initialization
  useEffect(() => {
    if (sessionId && encounterContext.patientId && !contextSentRef.current) {
      contextSentRef.current = true
      const summaryPrompt = `Provide a brief summary for this patient including: past medical history, current medications, and reason for visit (${encounterContext.reason || 'not specified'}). Keep it concise (3-5 sentences).`
      sendMessage(summaryPrompt, encounterContext.text, undefined, true)
    }
  }, [sessionId, encounterContext])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        addMessage({ text: `Unsupported file type: ${file.name}`, isUser: false, isStatus: true })
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

  const handleSend = () => {
    if (!input.trim() && !attachments.length) return
    let context: string | undefined
    if (transcription) {
      context = `[Encounter Transcription]\n${transcription}`
    }
    sendMessage(input.trim(), context, attachments.length ? attachments : undefined)
    setAttachments([])
    setTranscription(null)
    setInput("")
  }

  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text)
    addMessage({ text: `Transcription:\n\n${text}`, isUser: false, isStatus: true })
  }

  if (isLoading) {
    return (
      <div className="fixed top-0 right-0 w-[25vw] h-screen bg-background border-l flex items-center justify-center">
        <SpinnerGap size={32} className="animate-spin" />
      </div>
    )
  }

  return (
    <div
      className={`fixed top-0 right-0 w-[25vw] h-screen bg-background border-l flex flex-col ${dragOver ? "ring-2 ring-primary ring-inset" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
    >
      <div className="p-3 border-b font-semibold flex items-center gap-2">
        <img src={chrome.runtime.getURL("icon.png")} alt="" className="w-5 h-5" />
        Encounter
      </div>
      <EncounterRecorder onTranscriptionComplete={handleTranscriptionComplete} />
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`${m.isUser ? "flex justify-end" : ""} group`}>
            <div className={`max-w-[80%] rounded-lg px-3 text-sm break-words overflow-hidden ${m.isUser ? "bg-primary text-primary-foreground py-2" : m.isStatus ? "text-muted-foreground/60 italic font-light py-0.5" : "bg-muted py-2 prose prose-sm dark:prose-invert"}`}>
              {m.isUser || m.isStatus ? m.text : <Markdown>{m.text}</Markdown>}
            </div>
            {!m.isUser && !m.isStatus && (
              <button onClick={() => copyToClipboard(m.text, i)} className="mt-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition-opacity flex items-center gap-1 text-xs text-muted-foreground">
                {copiedIdx === i ? <><Check size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            )}
          </div>
        ))}
        {sending && <div className="flex justify-start ml-2"><SpinnerGap size={20} className="animate-spin" /></div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t space-y-2">
        {quickActions.filter(a => a.enabled).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {quickActions.filter(a => a.enabled).map((a, i) => (
              <button key={i} onClick={() => { sendMessage(a.text, transcription ? `[Encounter Transcription]\n${transcription}` : undefined); setTranscription(null) }} disabled={sending} className="text-xs bg-muted hover:bg-accent px-2 py-1 rounded">{a.text}</button>
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
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={dragOver ? "Drop files here..." : "Type a message..."}
            disabled={sending}
            rows={1}
            className="min-h-0 max-h-32 py-2 resize-none overflow-y-auto"
          />
          <Button size="icon" onClick={handleSend} disabled={(!input.trim() && !attachments.length) || sending}>
            <PaperPlaneTilt />
          </Button>
        </div>
      </div>
    </div>
  )
}
