/**
 * 浏览器录音工具：采集 PCM → 降采样 16k 单声道 → 编码 16-bit WAV。
 *
 * 为什么不直接用 MediaRecorder：MediaRecorder 产出的是 webm/opus（Safari 为 mp4），
 * 百炼 paraformer 文件识别要的是裸 PCM 容器（wav），且各浏览器封装格式不一，
 * 后端难统一处理。这里用 AudioContext + ScriptProcessor 拿原始 Float32 PCM，
 * 自行降采样并封 WAV 头，产物对所有平台一致、可直接送 /ai/asr。
 */

const TARGET_SAMPLE_RATE = 16000

export class PcmWavRecorder {
  /**
   * @param {(err: Error) => void} [onError] 采集异常回调（如麦克风被拒）
   */
  constructor(onError) {
    this.onError = onError || (() => {})
    this.audioContext = null
    this.mediaStream = null
    this.source = null
    this.processor = null
    this.chunks = [] // 每段 Float32Array（单声道）
    this.recording = false
  }

  /** 开始录音，申请麦克风权限 */
  async start() {
    if (this.recording) return
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
    })
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    this.audioContext = new AudioCtx()
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream)

    // ScriptProcessor 兼容性最好（AudioWorklet 需额外模块加载，短录音没必要）
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = event => {
      if (!this.recording) return
      const input = event.inputBuffer.getChannelData(0)
      // 拷贝一份：inputBuffer 会被复用
      this.chunks.push(new Float32Array(input))
    }
    this.source.connect(this.processor)
    this.processor.connect(this.audioContext.destination)
    this.recording = true
  }

  /**
   * 停止录音并返回 WAV Blob（16k 单声道 16-bit PCM）。
   * @returns {Promise<Blob>}
   */
  async stop() {
    if (!this.recording) return Promise.resolve(new Blob([], { type: 'audio/wav' }))
    this.recording = false
    const sampleRate = this.audioContext.sampleRate
    try {
      this.processor && this.processor.disconnect()
      this.source && this.source.disconnect()
      this.mediaStream && this.mediaStream.getTracks().forEach(track => track.stop())
      this.audioContext && (await this.audioContext.close())
    } catch (e) {
      // 资源释放失败不影响已采集数据
    }

    const merged = mergeChunks(this.chunks)
    this.chunks = []
    const downsampled = downsample(merged, sampleRate, TARGET_SAMPLE_RATE)
    return encodeWav(downsampled, TARGET_SAMPLE_RATE)
  }
}

/** 拼接分段 Float32 为单条连续样本 */
function mergeChunks(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const merged = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

/** 线性插值降采样到目标采样率 */
function downsample(input, fromRate, toRate) {
  if (toRate >= fromRate) return input
  const ratio = fromRate / toRate
  const outLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const start = i * ratio
    const end = Math.min(start + ratio, input.length)
    let sum = 0
    let count = 0
    for (let j = Math.floor(start); j < Math.ceil(end); j++) {
      sum += input[j] || 0
      count++
    }
    output[i] = count ? sum / count : 0
  }
  return output
}

/** Float32 PCM → 16-bit WAV Blob（含 44 字节 RIFF 头） */
function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)          // fmt 块大小
  view.setUint16(20, 1, true)           // PCM 编码
  view.setUint16(22, 1, true)           // 单声道
  view.setUint32(24, sampleRate, true)  // 采样率
  view.setUint32(28, sampleRate * 2, true) // 字节率 = 采样率 * 声道 * 位深/8
  view.setUint16(32, 2, true)           // 块对齐
  view.setUint16(34, 16, true)          // 位深
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([view], { type: 'audio/wav' })
}
