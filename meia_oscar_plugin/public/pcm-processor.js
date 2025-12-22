class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = []
  }
  process(inputs) {
    const input = inputs[0]?.[0]
    if (input) {
      const ratio = sampleRate / 16000
      for (let i = 0; i < input.length; i++) {
        this.buffer.push(input[i])
      }
      const outLen = Math.floor(this.buffer.length / ratio)
      if (outLen > 0) {
        const pcm = new Int16Array(outLen)
        for (let i = 0; i < outLen; i++) {
          const sample = this.buffer[Math.floor(i * ratio)]
          pcm[i] = Math.max(-32768, Math.min(32767, sample * 32768))
        }
        this.buffer = this.buffer.slice(Math.floor(outLen * ratio))
        this.port.postMessage(pcm.buffer, [pcm.buffer])
      }
    }
    return true
  }
}
registerProcessor("pcm-processor", PCMProcessor)
