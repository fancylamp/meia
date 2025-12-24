import { useState, useMemo } from "react"
import { BACKEND_URL } from "./useAuth"

export type Message = { id?: string; text: string; isUser: boolean; isStatus?: boolean; isStreaming?: boolean }
export type Attachment = { name: string; type: string; data: string }

export function useEncounterChat(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const chatSessionId = useMemo(() => `encounter-${crypto.randomUUID()}`, [])

  const addMessage = (msg: Message) => setMessages((m) => [...m, msg])

  const sendMessage = async (text: string, context?: string, attachments?: Attachment[], hidden?: boolean) => {
    if ((!text.trim() && !attachments?.length) || !sessionId) return
    setSuggestedActions([])  // Clear previous suggestions
    if (!hidden) {
      const displayText = attachments?.length ? `${text} [${attachments.map((f) => f.name).join(", ")}]` : text
      addMessage({ text: displayText, isUser: true })
    }
    setSending(true)
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, chat_session_id: chatSessionId, message: text, context, attachments: attachments?.length ? attachments : undefined }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let streamingMsgId: string | null = null
      let accumulatedText = ""
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue
          try {
            const event = JSON.parse(line.slice(6))
            console.log('[SSE Event]', event)
            if (event.type === "tool_call") {
              if (streamingMsgId) {
                streamingMsgId = null
                accumulatedText = ""
              }
              addMessage({ text: event.description, isUser: false, isStatus: true })
            } else if (event.type === "text_chunk" && event.text) {
              if (!streamingMsgId) streamingMsgId = crypto.randomUUID()
              accumulatedText += event.text
              setMessages((m) => {
                const idx = m.findIndex((x) => x.id === streamingMsgId)
                if (idx >= 0) {
                  const updated = [...m]
                  updated[idx] = { ...m[idx], text: accumulatedText }
                  return updated
                }
                return [...m, { id: streamingMsgId, text: accumulatedText, isUser: false, isStreaming: true }]
              })
            } else if (event.type === "response") {
              if (streamingMsgId) {
                setMessages((m) => {
                  const idx = m.findIndex((x) => x.id === streamingMsgId)
                  if (idx >= 0) {
                    const updated = [...m]
                    updated[idx] = { ...m[idx], isStreaming: false }
                    return updated
                  }
                  return m
                })
                streamingMsgId = null
                accumulatedText = ""
              } else if (event.text) {
                addMessage({ text: event.text, isUser: false })
              }
              if (event.suggested_actions?.length) setSuggestedActions(event.suggested_actions)
            }
          } catch {}
        }
      }
    } catch {
      addMessage({ text: "An error occurred, please try again.", isUser: false, isStatus: true })
    }
    setSending(false)
  }

  const clearMessages = () => setMessages([])

  return { messages, sending, suggestedActions, sendMessage, addMessage, clearMessages, setSuggestedActions }
}
