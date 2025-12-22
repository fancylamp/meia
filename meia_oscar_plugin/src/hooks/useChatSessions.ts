import { useState, useEffect, useCallback } from "react"
import { BACKEND_URL } from "./useAuth"

export type Message = { text: string; isUser: boolean; isStatus?: boolean }
type TabState = { messages: Message[]; sending: boolean }

const ACTIVE_TAB_KEY = "meia_active_tab"

export function useChatSessions(sessionId: string | null, isAuthenticated: boolean) {
  const [tabs, setTabs] = useState<string[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({})
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async (chatId: string) => {
    if (!sessionId) return
    const res = await fetch(`${BACKEND_URL}/chat-sessions/${chatId}/messages?session_id=${sessionId}`)
    const data = await res.json()
    setTabStates((s) => ({ ...s, [chatId]: { ...s[chatId], messages: data.messages || [], sending: s[chatId]?.sending || false } }))
  }, [sessionId])

  const init = useCallback(async () => {
    if (!sessionId || !isAuthenticated) return
    setLoading(true)
    const res = await fetch(`${BACKEND_URL}/chat-sessions?session_id=${sessionId}`)
    const data = await res.json()
    let sessionTabs = data.sessions || []
    
    if (!sessionTabs.length) {
      const createRes = await fetch(`${BACKEND_URL}/chat-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const created = await createRes.json()
      sessionTabs = [created.id]
    }
    
    const initialStates: Record<string, TabState> = {}
    for (const id of sessionTabs) {
      initialStates[id] = { messages: [], sending: false }
    }
    setTabStates(initialStates)
    setTabs(sessionTabs)
    
    const stored = await chrome.storage.local.get(ACTIVE_TAB_KEY)
    const savedTab = stored[ACTIVE_TAB_KEY]
    const initialTab = sessionTabs.includes(savedTab) ? savedTab : sessionTabs[0]
    setActiveTabId(initialTab)
    await fetchMessages(initialTab)
    setLoading(false)
  }, [sessionId, isAuthenticated, fetchMessages])

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (activeTabId && !tabStates[activeTabId]?.messages.length) {
      fetchMessages(activeTabId)
    }
  }, [activeTabId, fetchMessages, tabStates])

  const createTab = async () => {
    if (!sessionId || tabs.length >= 6) return
    const res = await fetch(`${BACKEND_URL}/chat-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
    const data = await res.json()
    setTabStates((s) => ({ ...s, [data.id]: { messages: [], sending: false } }))
    setTabs((t) => [...t, data.id])
    setActiveTabId(data.id)
    chrome.storage.local.set({ [ACTIVE_TAB_KEY]: data.id })
  }

  const deleteTab = async (tabId: string) => {
    if (!sessionId || tabs.length <= 1) return
    await fetch(`${BACKEND_URL}/chat-sessions/${tabId}?session_id=${sessionId}`, { method: "DELETE" })
    const newTabs = tabs.filter((t) => t !== tabId)
    setTabs(newTabs)
    setTabStates((s) => {
      const { [tabId]: _, ...rest } = s
      return rest
    })
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0])
      chrome.storage.local.set({ [ACTIVE_TAB_KEY]: newTabs[0] })
    }
  }

  const switchTab = (tabId: string) => {
    setActiveTabId(tabId)
    chrome.storage.local.set({ [ACTIVE_TAB_KEY]: tabId })
  }

  const addMessageToTab = (tabId: string, msg: Message) => {
    setTabStates((s) => ({
      ...s,
      [tabId]: { ...s[tabId], messages: [...(s[tabId]?.messages || []), msg] }
    }))
  }

  const setTabSending = (tabId: string, sending: boolean) => {
    setTabStates((s) => ({
      ...s,
      [tabId]: { ...s[tabId], sending }
    }))
  }

  const activeState = activeTabId ? tabStates[activeTabId] : null

  return {
    tabs,
    activeTabId,
    messages: activeState?.messages || [],
    sending: activeState?.sending || false,
    loading,
    createTab,
    deleteTab,
    switchTab,
    addMessageToTab,
    setTabSending,
  }
}
