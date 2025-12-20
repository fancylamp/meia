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
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const valid = await checkSession(stored)
        if (valid) {
          setSessionId(stored)
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
      setIsLoading(false)
    }
    init()
  }, [checkSession])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "oauth_complete") {
        if (event.data.success) {
          const sid = event.data.session_id
          localStorage.setItem(STORAGE_KEY, sid)
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

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSessionId(null)
    setIsAuthenticated(false)
  }

  return { sessionId, isAuthenticated, isLoading, error, login, logout }
}

export { BACKEND_URL }
