package expo.modules.sonikaaudioengine

import android.media.*
import android.media.audiofx.Equalizer
import android.media.audiofx.PresetReverb
import kotlinx.coroutines.*
import kotlin.math.*

// ── Settings ───────────────────────────────────────────────────────────────

data class AudioProcessorSettings(
  val leftGains:       FloatArray = FloatArray(5),   // dB per band
  val rightGains:      FloatArray = FloatArray(5),
  val leftVolume:      Float      = 0.8f,
  val rightVolume:     Float      = 0.8f,
  val amplification:   Float      = 1.0f,
  val stereoBalance:   Float      = 0.0f,
  val sonikaClean:     Boolean    = false,
  val conversationMode:Boolean    = false,
  val monoMode:        Boolean    = false,
  val monoChannel:     Int        = 0               // 0=left, 1=right
)

// ── Biquad filter (Direct Form I, float) ───────────────────────────────────

class BiquadFilter {
  private var b0 = 1f; private var b1 = 0f; private var b2 = 0f
  private var a1 = 0f; private var a2 = 0f
  private var x1 = 0f; private var x2 = 0f
  private var y1 = 0f; private var y2 = 0f

  fun setPeaking(freq: Float, sampleRate: Float, gainDb: Float, q: Float = 1.41f) {
    if (gainDb == 0f) { passthrough(); return }
    val w0   = 2f * PI.toFloat() * freq / sampleRate
    val cosW = cos(w0); val sinW = sin(w0)
    val A    = 10f.pow(gainDb / 40f)
    val alpha = sinW / (2f * q)
    val a0inv = 1f / (1f + alpha / A)
    b0 = (1f + alpha * A) * a0inv; b1 = -2f * cosW * a0inv; b2 = (1f - alpha * A) * a0inv
    a1 = -2f * cosW * a0inv;       a2 = (1f - alpha / A) * a0inv
  }

  fun setLowShelf(freq: Float, sampleRate: Float, gainDb: Float) {
    if (gainDb == 0f) { passthrough(); return }
    val w0   = 2f * PI.toFloat() * freq / sampleRate
    val cosW = cos(w0); val A = 10f.pow(gainDb / 40f); val sqA = sqrt(A)
    val alpha = sin(w0) / 2f * sqrt((A + 1f / A) * (1f - 1f) + 2f).coerceAtLeast(0.001f)
    val a0    = (A+1f) + (A-1f)*cosW + 2f*sqA*alpha
    val a0inv = 1f / a0
    b0 =  A * ((A+1f) - (A-1f)*cosW + 2f*sqA*alpha) * a0inv
    b1 =  2f*A * ((A-1f) - (A+1f)*cosW)             * a0inv
    b2 =  A * ((A+1f) - (A-1f)*cosW - 2f*sqA*alpha) * a0inv
    a1 = -2f * ((A-1f) + (A+1f)*cosW)               * a0inv
    a2 =      ((A+1f) + (A-1f)*cosW - 2f*sqA*alpha) * a0inv
  }

  fun setHighShelf(freq: Float, sampleRate: Float, gainDb: Float) {
    if (gainDb == 0f) { passthrough(); return }
    val w0   = 2f * PI.toFloat() * freq / sampleRate
    val cosW = cos(w0); val A = 10f.pow(gainDb / 40f); val sqA = sqrt(A)
    val alpha = sin(w0) / 2f * sqrt((A + 1f / A) * (1f - 1f) + 2f).coerceAtLeast(0.001f)
    val a0    = (A+1f) - (A-1f)*cosW + 2f*sqA*alpha
    val a0inv = 1f / a0
    b0 =  A * ((A+1f) + (A-1f)*cosW + 2f*sqA*alpha) * a0inv
    b1 = -2f*A * ((A-1f) + (A+1f)*cosW)             * a0inv
    b2 =  A * ((A+1f) + (A-1f)*cosW - 2f*sqA*alpha) * a0inv
    a1 =  2f * ((A-1f) - (A+1f)*cosW)               * a0inv
    a2 =      ((A+1f) - (A-1f)*cosW - 2f*sqA*alpha) * a0inv
  }

  private fun passthrough() { b0=1f; b1=0f; b2=0f; a1=0f; a2=0f; resetState() }
  fun resetState() { x1=0f; x2=0f; y1=0f; y2=0f }

  fun process(buf: FloatArray, offset: Int = 0, len: Int = buf.size - offset) {
    for (i in offset until offset + len) {
      val x = buf[i]
      val y = b0*x + b1*x1 + b2*x2 - a1*y1 - a2*y2
      x2=x1; x1=x; y2=y1; y1=y; buf[i] = y
    }
  }
}

// ── 5-band channel EQ ──────────────────────────────────────────────────────

class ChannelEQ {
  private val filters = Array(5) { BiquadFilter() }
  private val freqs   = floatArrayOf(125f, 500f, 1000f, 3000f, 8000f)

  fun updateBands(gains: FloatArray, sampleRate: Float) {
    for (i in 0..4) {
      when (i) {
        0    -> filters[i].setLowShelf(freqs[i], sampleRate, gains[i])
        4    -> filters[i].setHighShelf(freqs[i], sampleRate, gains[i])
        else -> filters[i].setPeaking(freqs[i], sampleRate, gains[i])
      }
    }
  }

  fun process(buf: FloatArray, offset: Int = 0, len: Int = buf.size - offset) {
    filters.forEach { it.process(buf, offset, len) }
  }

  fun reset() { filters.forEach { it.resetState() } }
}

// ── SonikaAudioProcessor ──────────────────────────────────────────────────

class SonikaAudioProcessor {

  private val SAMPLE_RATE   = 44100
  private val CHANNEL_IN    = AudioFormat.CHANNEL_IN_MONO
  private val CHANNEL_OUT   = AudioFormat.CHANNEL_OUT_STEREO
  private val ENCODING      = AudioFormat.ENCODING_PCM_FLOAT

  private var audioRecord:  AudioRecord?  = null
  private var audioTrack:   AudioTrack?   = null

  private val leftEQ  = ChannelEQ()
  private val rightEQ = ChannelEQ()

  @Volatile private var _settings = AudioProcessorSettings()
  val currentSettings: AudioProcessorSettings get() = _settings
  @Volatile var isRunning = false

  var onVolumeLevel: ((Float) -> Unit)? = null

  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  // Noise gate state
  private var gateRelease = 0f

  // ── Public API ─────────────────────────────────────────────────────────

  @Throws(Exception::class)
  fun start(output: String) {
    if (isRunning) return

    val minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_IN, ENCODING)
    val recBuf  = maxOf(minBuf, 2048) * 4      // generous buffer to avoid underruns

    audioRecord = AudioRecord(
      MediaRecorder.AudioSource.MIC,
      SAMPLE_RATE, CHANNEL_IN, ENCODING, recBuf
    )
    check(audioRecord!!.state == AudioRecord.STATE_INITIALIZED) { "AudioRecord init failed" }

    val trackBuf = maxOf(
      AudioTrack.getMinBufferSize(SAMPLE_RATE, CHANNEL_OUT, ENCODING), 4096
    ) * 4

    audioTrack = AudioTrack.Builder()
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
      )
      .setAudioFormat(
        AudioFormat.Builder()
          .setSampleRate(SAMPLE_RATE)
          .setEncoding(ENCODING)
          .setChannelMask(CHANNEL_OUT)
          .build()
      )
      .setBufferSizeInBytes(trackBuf)
      .setTransferMode(AudioTrack.MODE_STREAM)
      .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
      .build()

    val s = _settings
    leftEQ.updateBands(s.leftGains,  SAMPLE_RATE.toFloat())
    rightEQ.updateBands(s.rightGains, SAMPLE_RATE.toFloat())

    audioRecord!!.startRecording()
    audioTrack!!.play()
    isRunning = true

    scope.launch { processingLoop() }
  }

  fun stop() {
    isRunning = false
    scope.coroutineContext.cancelChildren()
    audioRecord?.stop(); audioRecord?.release(); audioRecord = null
    audioTrack?.stop();  audioTrack?.release();  audioTrack = null
    leftEQ.reset(); rightEQ.reset()
    gateRelease = 0f
  }

  fun applySettings(s: AudioProcessorSettings) {
    _settings = s
    leftEQ.updateBands(s.leftGains,  SAMPLE_RATE.toFloat())
    rightEQ.updateBands(s.rightGains, SAMPLE_RATE.toFloat())
  }

  // ── Processing loop ────────────────────────────────────────────────────

  private suspend fun processingLoop() = withContext(Dispatchers.IO) {
    // Mono float read buffer (~11 ms @ 44100)
    val monoSize = 512
    val mono     = FloatArray(monoSize)
    // Stereo output: interleaved L,R pairs
    val stereo   = FloatArray(monoSize * 2)
    // Independent channel work buffers
    val leftBuf  = FloatArray(monoSize)
    val rightBuf = FloatArray(monoSize)

    while (isRunning) {
      val read = audioRecord?.read(mono, 0, monoSize, AudioRecord.READ_BLOCKING) ?: break
      if (read <= 0) continue

      val s = _settings

      // Copy mono → both channels
      System.arraycopy(mono, 0, leftBuf,  0, read)
      System.arraycopy(mono, 0, rightBuf, 0, read)

      // Sonika Clean: noise gate + soft clip
      if (s.sonikaClean) {
        applyNoisGate(leftBuf,  read)
        applyNoisGate(rightBuf, read)
      }

      // EQ
      leftEQ.process(leftBuf,  0, read)
      rightEQ.process(rightBuf, 0, read)

      // Mono mode
      if (s.monoMode) {
        if (s.monoChannel == 0) System.arraycopy(leftBuf, 0, rightBuf, 0, read)
        else System.arraycopy(rightBuf, 0, leftBuf, 0, read)
      }

      // Volume, amplification, balance
      val amp = s.amplification.coerceAtMost(8f)
      val bal = s.stereoBalance.coerceIn(-1f, 1f)
      val lGain = (s.leftVolume  * amp * if (bal > 0) (1f - bal) else 1f).coerceAtMost(8f)
      val rGain = (s.rightVolume * amp * if (bal < 0) (1f + bal) else 1f).coerceAtMost(8f)

      // Interleave to stereo + compute RMS for volume level
      var sumSq = 0f
      for (i in 0 until read) {
        val l = (leftBuf[i]  * lGain).coerceIn(-1f, 1f)
        val r = (rightBuf[i] * rGain).coerceIn(-1f, 1f)
        stereo[i * 2]     = l
        stereo[i * 2 + 1] = r
        sumSq += l * l
      }

      val rms   = sqrt(sumSq / read)
      val level = (rms * 6f).coerceIn(0f, 1f)
      onVolumeLevel?.invoke(level)

      audioTrack?.write(stereo, 0, read * 2, AudioTrack.WRITE_BLOCKING)
    }
  }

  // Simple noise gate + tanh soft-clip
  private fun applyNoisGate(buf: FloatArray, len: Int) {
    var sumSq = 0f
    for (i in 0 until len) sumSq += buf[i] * buf[i]
    val rms = sqrt(sumSq / len)

    gateRelease = if (rms < 0.02f) (gateRelease + 0.05f).coerceAtMost(1f)
                  else             (gateRelease - 0.2f).coerceAtLeast(0f)

    val attenuation = if (gateRelease > 0.5f) 1f - gateRelease else 1f
    for (i in 0 until len) {
      val x = buf[i] * attenuation
      buf[i] = x / (1f + abs(x))   // tanh-approximation soft clip
    }
  }
}
