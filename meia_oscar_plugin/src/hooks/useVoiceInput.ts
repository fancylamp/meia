import { useState, useRef, useCallback } from "react"
import Recorder from "recorder-js"
import { BACKEND_URL } from "./useAuth"

const WS_URL = BACKEND_URL.replace("http", "ws")
const CHUNK_INTERVAL_MS = 1000

type VoiceCallbacks = {
  onTranscript: (text: string) => void
  onModeChange: (active: boolean) => void
  onError: () => void
}

export function useVoiceInput(sessionId: string | null, callbacks: VoiceCallbacks) {
  const [isRecording, setIsRecording] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<Recorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRecordingRef = useRef(false)

  const sendAudio = useCallback(async () => {
    if (!recorderRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    const result = await recorderRef.current.stop()
    wsRef.current.send(result.blob)
    recorderRef.current.start()
  }, [])

  const startSampling = useCallback(() => {
    sendAudio()
    timerRef.current = setTimeout(startSampling, CHUNK_INTERVAL_MS)
  }, [sendAudio])

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    wsRef.current?.close()
    timerRef.current = null
    recorderRef.current = null
    streamRef.current = null
    wsRef.current = null
  }, [])

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return
    sendAudio() // Send final chunk
    cleanup()
    isRecordingRef.current = false
    setIsRecording(false)
    callbacks.onModeChange(false)
  }, [cleanup, sendAudio, callbacks])

  const startRecording = useCallback(async () => {
    if (!sessionId || isRecordingRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ws = new WebSocket(`${WS_URL}/voice?session_id=${sessionId}`)
      wsRef.current = ws

      ws.onopen = async () => {
        const audioContext = new AudioContext()
        const recorder = new Recorder(audioContext)
        await recorder.init(stream)
        await recorder.start()
        recorderRef.current = recorder

        isRecordingRef.current = true
        setIsRecording(true)
        callbacks.onModeChange(true)
        startSampling()
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.transcript) callbacks.onTranscript(data.transcript)
        } catch {}
      }

      ws.onerror = () => {
        if (!isRecordingRef.current) callbacks.onError()
        else stopRecording()
      }
      ws.onclose = () => stopRecording()
    } catch {
      callbacks.onError()
    }
  }, [sessionId, callbacks, stopRecording, startSampling])

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) stopRecording()
    else startRecording()
  }, [startRecording, stopRecording])

  return { isRecording, toggleRecording }
}
