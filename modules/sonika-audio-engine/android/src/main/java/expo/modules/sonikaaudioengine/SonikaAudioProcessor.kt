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
  val monoChannel:     Int        = 0,              // 0=left, 1=right
  val micSource:       String     = "smartphone",   // smartphone | bluetooth | combined
  val audioOutput:     String     = "bluetooth_headphones", // bone_conduction | bluetooth_headphones | jack
  val audioQuality:    String     = "low_latency"   // low_latency | high_quality
)

// ── AGC / compressione dinamica (modalità alta qualità) ────────────────────
// Alza dolcemente i suoni deboli e trattiene quelli forti (stile WDRC
// monobanda): attacco rapido, rilascio lento, boost massimo +12 dB.

class Agc {
  private val targetRms = 0.12f
  private val maxGain = 4f      // +12 dB
  private val minGain = 0.5f    // -6 dB
  private var gain = 1f

  fun process(l: FloatArray, r: FloatArray, len: Int) {
    var sum = 0f
    for (i in 0 until len) sum += l[i] * l[i] + r[i] * r[i]
    val rms = sqrt(sum / (2f * len))
    if (rms > 1e-4f) {
      val desired = (targetRms / rms).coerceIn(minGain, maxGain)
      // attacco rapido quando serve abbassare, rilascio lento quando alza
      val coeff = if (desired < gain) 0.80f else 0.995f
      gain = coeff * gain + (1f - coeff) * desired
    }
    for (i in 0 until len) { l[i] *= gain; r[i] *= gain }
  }

  fun reset() { gain = 1f }
}

// ── Generatore di toni puri (test dell'udito) ──────────────────────────────
// Loop senza click: il buffer contiene un numero intero di cicli.

class ToneGenerator {
  private var track: AudioTrack? = null

  fun play(frequency: Double, ear: String, amplitude: Double) {
    stop()
    val sr = 44100
    val cycles = maxOf(1, Math.round(frequency).toInt()) // ~1 s di segnale
    val frames = Math.round(cycles * sr / frequency).toInt()
    val amp = amplitude.coerceIn(0.0, 1.0).toFloat()
    val fadeFrames = minOf(frames / 4, sr / 50) // 20 ms anti-click

    val buf = FloatArray(frames * 2)
    for (i in 0 until frames) {
      var v = (kotlin.math.sin(2.0 * Math.PI * frequency * i / sr) * amp).toFloat()
      if (i < fadeFrames) v *= i / fadeFrames.toFloat()
      buf[i * 2]     = if (ear == "right") 0f else v
      buf[i * 2 + 1] = if (ear == "left") 0f else v
    }

    val t = AudioTrack.Builder()
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      .setAudioFormat(
        AudioFormat.Builder()
          .setSampleRate(sr)
          .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
          .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
          .build()
      )
      .setBufferSizeInBytes(buf.size * 4)
      .setTransferMode(AudioTrack.MODE_STATIC)
      .build()
    t.write(buf, 0, buf.size, AudioTrack.WRITE_BLOCKING)
    t.setLoopPoints(0, frames, -1)
    t.play()
    track = t
  }

  fun stop() {
    try { track?.stop(); track?.release() } catch (_: Exception) {}
    track = null
  }
}

// ── Peak limiter (attacco istantaneo, release ~150 ms) ─────────────────────
// Protegge l'udito dell'utente: limita i picchi in uscita senza la distorsione
// dell'hard clipping. Fondamentale con amplificazione fino a 8x.

class PeakLimiter(private val sampleRate: Float) {
  private val threshold = 0.89f                                  // ≈ -1 dBFS
  private val releaseCoeff = exp(-1f / (0.150f * sampleRate))    // release 150 ms
  private var envelope = 0f

  fun process(sample: Float): Float {
    val mag = abs(sample)
    envelope = if (mag > envelope) mag else envelope * releaseCoeff
    return if (envelope > threshold) sample * (threshold / envelope) else sample
  }

  fun reset() { envelope = 0f }
}

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
  private var audioManager: AudioManager? = null
  private var scoStarted = false

  // Effetti hardware/di sistema legati alla sessione di registrazione
  private var noiseSuppressor: android.media.audiofx.NoiseSuppressor? = null
  private var echoCanceler: android.media.audiofx.AcousticEchoCanceler? = null

  private val leftEQ  = ChannelEQ()
  private val rightEQ = ChannelEQ()
  private val leftLimiter  = PeakLimiter(44100f)
  private val rightLimiter = PeakLimiter(44100f)
  private val agc = Agc()

  @Volatile private var _settings = AudioProcessorSettings()
  val currentSettings: AudioProcessorSettings get() = _settings
  @Volatile var isRunning = false

  var onVolumeLevel: ((Float) -> Unit)? = null

  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  // Noise gate state
  private var gateRelease = 0f

  // ── Public API ─────────────────────────────────────────────────────────

  @Throws(Exception::class)
  fun start(am: AudioManager?) {
    if (isRunning) return
    audioManager = am
    val s0 = _settings

    // Bassa latenza = buffer minimi; alta qualità = buffer generosi (no underrun)
    val bufMult = if (s0.audioQuality == "low_latency") 2 else 4
    val minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_IN, ENCODING)
    val recBuf  = maxOf(minBuf, 2048) * bufMult

    // In modalità Conversazione usiamo VOICE_COMMUNICATION: attiva le
    // ottimizzazioni voce del sistema (AEC/NS hardware dove disponibili).
    val source = if (s0.conversationMode) {
      MediaRecorder.AudioSource.VOICE_COMMUNICATION
    } else {
      MediaRecorder.AudioSource.MIC
    }

    audioRecord = AudioRecord(source, SAMPLE_RATE, CHANNEL_IN, ENCODING, recBuf)
    check(audioRecord!!.state == AudioRecord.STATE_INITIALIZED) { "AudioRecord init failed" }

    // Effetti di sistema sulla sessione: riduzione rumore reale (AI Clean)
    // ed eliminazione dell'eco (Conversazione), se il dispositivo li offre.
    try {
      val sessionId = audioRecord!!.audioSessionId
      if (android.media.audiofx.NoiseSuppressor.isAvailable()) {
        noiseSuppressor = android.media.audiofx.NoiseSuppressor.create(sessionId)
          ?.apply { enabled = s0.sonikaClean }
      }
      if (android.media.audiofx.AcousticEchoCanceler.isAvailable()) {
        echoCanceler = android.media.audiofx.AcousticEchoCanceler.create(sessionId)
          ?.apply { enabled = s0.conversationMode }
      }
    } catch (_: Exception) {
      // Gli effetti sono un bonus: mai bloccare l'avvio per la loro assenza.
    }

    val trackBuf = maxOf(
      AudioTrack.getMinBufferSize(SAMPLE_RATE, CHANNEL_OUT, ENCODING), 4096
    ) * bufMult

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

    applyRouting(am)

    audioRecord!!.startRecording()
    audioTrack!!.play()
    isRunning = true

    scope.launch { processingLoop() }
  }

  fun stop() {
    isRunning = false
    scope.coroutineContext.cancelChildren()
    try { noiseSuppressor?.release() } catch (_: Exception) {}
    try { echoCanceler?.release() } catch (_: Exception) {}
    noiseSuppressor = null; echoCanceler = null
    audioRecord?.stop(); audioRecord?.release(); audioRecord = null
    audioTrack?.stop();  audioTrack?.release();  audioTrack = null
    leftEQ.reset(); rightEQ.reset()
    leftLimiter.reset(); rightLimiter.reset()
    agc.reset()
    gateRelease = 0f
    stopSco()
    audioManager = null
  }

  fun applySettings(s: AudioProcessorSettings) {
    _settings = s
    leftEQ.updateBands(s.leftGains,  SAMPLE_RATE.toFloat())
    rightEQ.updateBands(s.rightGains, SAMPLE_RATE.toFloat())
    // Aggiornamento live degli effetti di sistema
    try { noiseSuppressor?.enabled = s.sonikaClean } catch (_: Exception) {}
    try { echoCanceler?.enabled = s.conversationMode } catch (_: Exception) {}
  }

  // ── Routing dispositivi ────────────────────────────────────────────────

  /**
   * Instrada mic e uscita sui dispositivi reali in base alle impostazioni.
   * - micSource bluetooth/combined → mic BT via SCO se disponibile
   * - audioOutput jack → cuffie con filo/USB se collegate
   * - altrimenti routing automatico di sistema (BT A2DP ha priorità nativa)
   */
  fun applyRouting(am: AudioManager?) {
    am ?: return
    if (am !== audioManager && isRunning) audioManager = am
    try {
      val s = _settings

      // ── Input ──
      val inputs = am.getDevices(AudioManager.GET_DEVICES_INPUTS)
      val btMic = inputs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
      val wantBtMic = (s.micSource == "bluetooth" || s.micSource == "combined") && btMic != null
      if (wantBtMic) {
        audioRecord?.preferredDevice = btMic
        startSco(am)
      } else {
        audioRecord?.preferredDevice =
          inputs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_MIC }
        stopSco()
      }

      // ── Output ──
      val outputs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      val preferredOut = when (s.audioOutput) {
        "jack" -> outputs.firstOrNull {
          it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
          it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
          it.type == AudioDeviceInfo.TYPE_USB_HEADSET
        }
        // bone_conduction e bluetooth_headphones sono entrambi dispositivi BT A2DP
        else -> outputs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP }
      }
      // null → il sistema sceglie da solo (comunque BT se connesso)
      audioTrack?.preferredDevice = preferredOut
    } catch (_: Exception) {
      // Il routing non deve mai far cadere l'audio: in caso di errore
      // si resta sul routing automatico di sistema.
    }
  }

  @Suppress("DEPRECATION")
  private fun startSco(am: AudioManager) {
    if (scoStarted) return
    try {
      am.startBluetoothSco()
      am.isBluetoothScoOn = true
      scoStarted = true
    } catch (_: Exception) {}
  }

  @Suppress("DEPRECATION")
  private fun stopSco() {
    if (!scoStarted) return
    try {
      audioManager?.stopBluetoothSco()
      audioManager?.isBluetoothScoOn = false
    } catch (_: Exception) {}
    scoStarted = false
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

      // Volume/amplificazione per canale
      for (i in 0 until read) {
        leftBuf[i] *= lGain
        rightBuf[i] *= rGain
      }

      // Compressione dinamica (alta qualità): alza i suoni deboli,
      // trattiene i forti — prima del limiter di sicurezza.
      if (s.audioQuality == "high_quality") {
        agc.process(leftBuf, rightBuf, read)
      }

      // Interleave to stereo + limiter di sicurezza + RMS for volume level
      var sumSq = 0f
      for (i in 0 until read) {
        val l = leftLimiter.process(leftBuf[i]).coerceIn(-1f, 1f)
        val r = rightLimiter.process(rightBuf[i]).coerceIn(-1f, 1f)
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
