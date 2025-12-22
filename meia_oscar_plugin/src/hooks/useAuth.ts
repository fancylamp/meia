import { useState, useEffect, useCallback } from "react"

const BACKEND_URL = "http://localhost:8000"
const STORAGE_KEY = "meia_session_id"

export function useAuth() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkSession = useCallback(async (sid: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/status?session_id=${sid}`)
      const data = await response.json()
      return data.authenticated
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const stored = result[STORAGE_KEY] as string | undefined
      if (stored) {
        const valid = await checkSession(stored)
        if (valid) {
          setSessionId(stored)
          setIsAuthenticated(true)
        } else {
          await chrome.storage.local.remove(STORAGE_KEY)
        }
      }
      setIsLoading(false)
    }
    init()
  }, [checkSession])

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === "oauth_complete") {
        if (event.data.success) {
          const sid = event.data.session_id
          await chrome.storage.local.set({ [STORAGE_KEY]: sid })
          setSessionId(sid)
          setIsAuthenticated(true)
          setError(null)
        } else {
          setError(event.data.error || "Authorization failed")
        }
        setIsLoading(false)
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const login = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`)
      const data = await response.json()
      if (data.error) {
        setError(data.error)
        setIsLoading(false)
        return
      }
      setSessionId(data.session_id)
      window.open(data.auth_url, "oauth_popup", "width=600,height=700,scrollbars=yes")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect")
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await chrome.storage.local.remove(STORAGE_KEY)
    setSessionId(null)
    setIsAuthenticated(false)
  }

  return { sessionId, isAuthenticated, isLoading, error, login, logout }
}

export { BACKEND_URL }
