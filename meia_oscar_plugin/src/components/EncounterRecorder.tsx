import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Play, Pause, UploadSimple, Trash, SpinnerGap } from "@phosphor-icons/react"
import { BACKEND_URL } from "@/hooks/useAuth"

const PCM_PROCESSOR_CODE = `
  class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
      super()
      this.buffer = []
    }
    process(inputs) {
      const input = inputs[0]?.[0]
      if (input) {
        for (let i = 0; i < input.length; i++) {
          this.buffer.push(Math.max(-32768, Math.min(32767, input[i] * 32768)))
        }
        // Send every ~250ms (12000 samples at 48kHz)
        if (this.buffer.length >= 12000) {
          const pcm = new Int16Array(this.buffer)
          this.buffer = []
          this.port.postMessage(pcm.buffer, [pcm.buffer])
        }
      }
      return true
    }
  }
  registerProcessor("pcm-processor", PCMProcessor)
`

type Props = {
  onTranscriptionComplete: (text: string) => void
}

export function EncounterRecorder({ onTranscriptionComplete }: Props) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [status, setStatus] = useState("Ready to record")

  const socketRef = useRef<WebSocket | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const workletRef = useRef<AudioWorkletNode | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wsEndpoint = `ws://${BACKEND_URL.replace(/^https?:\/\//, "")}/recording/`

  const ensureSocket = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return socketRef.current
    const socket = new WebSocket(wsEndpoint)
    socket.binaryType = "arraybuffer"
    socket.onmessage = (event) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => stopRecording(), 300000)
      const data = JSON.parse(event.data)
      if (data.type === "complete") {
        onTranscriptionComplete(data.text)
        setStatus("Complete")
      } else if (data.text) {
        setTranscription(data.text)
        setTimeout(() => {
          if (textareaRef.current) textareaRef.current.scrollTop = textareaRef.current.scrollHeight
        }, 0)
      }
    }
    socketRef.current = socket
    return socket
  }

  const startRecording = async () => {
    ensureSocket()

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const context = new AudioContext()
    contextRef.current = context
    const source = context.createMediaStreamSource(stream)

    const blob = new Blob([PCM_PROCESSOR_CODE], { type: "application/javascript" })
    await context.audioWorklet.addModule(URL.createObjectURL(blob))
    const worklet = new AudioWorkletNode(context, "pcm-processor")
    worklet.port.onmessage = (e) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(e.data)
      }
    }
    workletRef.current = worklet
    source.connect(worklet)

    setIsRecording(true)
    setStatus("Recording...")
  }

  const stopRecording = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (contextRef.current?.state !== "closed") {
      contextRef.current?.close()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setIsRecording(false)
      setStatus("Paused")
    }
  }

  const handlePlayPause = () => {
    isRecording ? stopRecording() : startRecording()
  }

  const handleSubmit = () => {
    stopRecording()
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send("end")
      setStatus("Processing...")
    }
  }

  const handleClear = () => {
    stopRecording()
    socketRef.current?.close()
    socketRef.current = null
    setTranscription("")
    setStatus("Ready to record")
  }

  return (
    <div className="p-3 border-b space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">Transcribe</div>
          <div className="text-xs text-muted-foreground">{status}</div>
        </div>
        <div className="flex gap-2">
          {status === "Processing..." && <SpinnerGap size={16} className="animate-spin self-center" />}
          <Button size="icon" variant="outline" onClick={handlePlayPause} disabled={status === "Processing..."}>
            {isRecording ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button size="icon" variant="outline" onClick={handleClear} disabled={isRecording || !transcription}>
            <Trash size={16} />
          </Button>
          <Button size="icon" onClick={handleSubmit} disabled={isRecording || !transcription}>
            <UploadSimple size={16} />
          </Button>
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        value={transcription}
        readOnly
        placeholder="Live transcription will appear here..."
        className="text-xs resize-none overflow-y-auto h-[5lh]"
      />
    </div>
  )
}
