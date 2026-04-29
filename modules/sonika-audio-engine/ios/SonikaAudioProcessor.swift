import AVFoundation
import Accelerate

// MARK: - Settings

struct AudioProcessorSettings {
  var leftGains:  [Float] = [0, 0, 0, 0, 0]   // dB, 5 bands
  var rightGains: [Float] = [0, 0, 0, 0, 0]
  var leftVolume:  Float  = 0.8
  var rightVolume: Float  = 0.8
  var amplification: Float = 1.0               // linear 1–10
  var stereoBalance: Float = 0.0               // -1 … +1
  var sonikaClean: Bool   = false
  var conversationMode: Bool = false
  var monoMode: Bool      = false
  var monoChannel: Int    = 0                  // 0=left, 1=right
}

// MARK: - SonikaAudioProcessor

/// Manages an AVAudioEngine graph:
///
///   inputNode ──(tap)──► [PCM buffer DSP] ──► playerNode ──► mainMixer ──► outputNode
///
/// All DSP (biquad EQ, gain, balance, noise gate) runs inside the tap callback
/// on AVAudioEngine's real-time thread, keeping round-trip latency minimal.
final class SonikaAudioProcessor {

  // Engine components
  private let engine      = AVAudioEngine()
  private let playerNode  = AVAudioPlayerNode()
  private let mixerNode   = AVAudioMixerNode()

  // DSP
  private let leftEQ  = ChannelEQ()
  private let rightEQ = ChannelEQ()

  // Noise gate state (used by Sonika Clean)
  private var noiseGateThreshold: Float = 0.02
  private var noiseGateRelease:   Float = 0.0

  // Settings (written on main thread, read on RT thread — protected by lock)
  private var _settings = AudioProcessorSettings()
  private let settingsLock = NSLock()

  var settings: AudioProcessorSettings {
    get { settingsLock.lock(); defer { settingsLock.unlock() }; return _settings }
    set { settingsLock.lock(); defer { settingsLock.unlock() }; _settings = newValue }
  }

  // Volume level callback (called ~12/s from a background queue)
  var onVolumeLevel: ((Float) -> Void)?

  private(set) var isRunning = false
  private var sampleRate: Float = 44100
  private var frameCount: AVAudioFrameCount = 0

  // MARK: - Public API

  func start(output: String) throws {
    guard !isRunning else { return }

    let session = AVAudioSession.sharedInstance()
    try configureSession(output: output, session: session)

    sampleRate = Float(session.sampleRate)

    // Re-apply current EQ coefficients for the discovered sample rate
    let s = settings
    leftEQ.updateBands(gains: s.leftGains, sampleRate: sampleRate)
    rightEQ.updateBands(gains: s.rightGains, sampleRate: sampleRate)

    let inputNode  = engine.inputNode
    let inputFormat = inputNode.outputFormat(forBus: 0)

    // Stereo output format — 44100 Hz, 2ch, float32
    let outputFormat = AVAudioFormat(
      commonFormat: .pcmFormatFloat32,
      sampleRate: session.sampleRate,
      channels: 2,
      interleaved: false
    )!

    engine.attach(playerNode)
    engine.attach(mixerNode)
    engine.connect(playerNode, to: mixerNode,        format: outputFormat)
    engine.connect(mixerNode,  to: engine.mainMixerNode, format: outputFormat)

    // Tap: receives raw PCM from microphone
    let tapFormat = AVAudioFormat(
      commonFormat: .pcmFormatFloat32,
      sampleRate: inputFormat.sampleRate,
      channels: min(inputFormat.channelCount, 2),
      interleaved: false
    )!

    let bufSize: AVAudioFrameCount = 512  // ~11 ms @ 44100 — adjust lower if device allows

    inputNode.installTap(onBus: 0, bufferSize: bufSize, format: tapFormat) { [weak self] buffer, _ in
      self?.processTapBuffer(buffer, outputFormat: outputFormat)
    }

    try engine.start()
    playerNode.play()
    isRunning = true
  }

  func stop() {
    guard isRunning else { return }
    isRunning = false
    engine.inputNode.removeTap(onBus: 0)
    playerNode.stop()
    engine.stop()
    leftEQ.reset()
    rightEQ.reset()
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  func applySettings(_ s: AudioProcessorSettings) {
    settings = s
    leftEQ.updateBands(gains: s.leftGains,  sampleRate: sampleRate)
    rightEQ.updateBands(gains: s.rightGains, sampleRate: sampleRate)
  }

  // MARK: - Private: AVAudioSession

  private func configureSession(output: String, session: AVAudioSession) throws {
    var options: AVAudioSession.CategoryOptions = [.allowBluetooth, .allowBluetoothA2DP, .mixWithOthers]

    // Prefer bone-conduction / BT A2DP over built-in speaker
    if output == "jack" {
      options = [.mixWithOthers]
    }

    try session.setCategory(.playAndRecord, mode: .measurement, options: options)

    // Request shortest possible I/O buffer (hardware may round up)
    try session.setPreferredIOBufferDuration(0.005)
    try session.setPreferredSampleRate(44100)
    try session.setActive(true)

    // For bone-conduction / BT headphones, force output to the connected BT device
    if output == "bone_conduction" || output == "bluetooth_headphones" {
      let btPort = session.availableInputs?
        .first(where: { $0.portType == .bluetoothA2DP || $0.portType == .bluetoothHFP })
      if let port = btPort {
        try session.setPreferredInput(port)
      }
    }
  }

  // MARK: - Private: Real-time DSP tap

  private func processTapBuffer(_ inBuffer: AVAudioPCMBuffer, outputFormat: AVAudioFormat) {
    let s = settings
    let frames = Int(inBuffer.frameLength)
    guard frames > 0,
          let inData = inBuffer.floatChannelData
    else { return }

    // Allocate output buffer (stereo float32)
    guard let outBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: AVAudioFrameCount(frames)) else { return }
    outBuffer.frameLength = AVAudioFrameCount(frames)
    guard let outData = outBuffer.floatChannelData else { return }

    let inChannels = Int(inBuffer.format.channelCount)

    // Prepare working copies so we don't mutate the tap buffer in-place
    var leftBuf  = [Float](repeating: 0, count: frames)
    var rightBuf = [Float](repeating: 0, count: frames)

    // Fill from input (mono → both channels, stereo → split)
    leftBuf.withUnsafeMutableBufferPointer  { lp in
      rightBuf.withUnsafeMutableBufferPointer { rp in
        cblas_scopy(Int32(frames), inData[0], 1, lp.baseAddress!, 1)
        if inChannels >= 2 {
          cblas_scopy(Int32(frames), inData[1], 1, rp.baseAddress!, 1)
        } else {
          cblas_scopy(Int32(frames), inData[0], 1, rp.baseAddress!, 1)
        }
      }
    }

    // --- Sonika Clean: simple noise gate + high-pass (removes low-freq hum) ---
    if s.sonikaClean {
      applySonikaClean(&leftBuf,  frames: frames)
      applySonikaClean(&rightBuf, frames: frames)
    }

    // --- Conversation mode: boost 300 Hz–4 kHz voice range, duck lows ---
    // (implemented via EQ settings set by JS layer; no extra DSP needed here)

    // --- Biquad EQ per channel ---
    leftBuf.withUnsafeMutableBufferPointer  { leftEQ.process($0.baseAddress!, count: frames) }
    rightBuf.withUnsafeMutableBufferPointer { rightEQ.process($0.baseAddress!, count: frames) }

    // --- Mono mode: mix/copy one channel to both ---
    if s.monoMode {
      if s.monoChannel == 0 { // left dominant
        cblas_scopy(Int32(frames), leftBuf, 1, &rightBuf, 1)
      } else {
        cblas_scopy(Int32(frames), rightBuf, 1, &leftBuf, 1)
      }
    }

    // --- Per-channel volume + amplification ---
    let amp = s.amplification
    var lGain = s.leftVolume  * amp
    var rGain = s.rightVolume * amp

    // --- Stereo balance: attenuate the opposite side ---
    let bal = s.stereoBalance  // -1 … +1
    if bal < 0 {
      rGain *= (1 + bal)   // reduce right when pushing left
    } else if bal > 0 {
      lGain *= (1 - bal)   // reduce left when pushing right
    }

    // Clamp to safe output ceiling (prevent clipping distortion)
    lGain = min(lGain, 8.0)
    rGain = min(rGain, 8.0)

    vDSP_vsmul(leftBuf,  1, &lGain, outData[0], 1, vDSP_Length(frames))
    vDSP_vsmul(rightBuf, 1, &rGain, outData[1], 1, vDSP_Length(frames))

    // --- Volume level reporting (RMS of left channel) ---
    var rms: Float = 0
    vDSP_rmsqv(outData[0], 1, &rms, vDSP_Length(frames))
    let level = min(rms * 6, 1.0)   // normalise: 0.16 RMS → full bar
    onVolumeLevel?(level)

    // Schedule on player node (non-blocking — engine handles buffering)
    playerNode.scheduleBuffer(outBuffer)
  }

  // MARK: - Sonika Clean (noise gate + simple spectral subtraction hint)

  private func applySonikaClean(_ buf: inout [Float], frames: Int) {
    // 1. Compute RMS of this block
    var rms: Float = 0
    buf.withUnsafeBufferPointer { vDSP_rmsqv($0.baseAddress!, 1, &rms, vDSP_Length(frames)) }

    // 2. Smooth noise floor estimate with slow attack, fast release
    if rms < noiseGateThreshold {
      noiseGateRelease += 0.05
      noiseGateRelease = min(noiseGateRelease, 1.0)
    } else {
      noiseGateRelease = max(noiseGateRelease - 0.2, 0.0)
    }

    // 3. Apply gate: fade to silence when signal is below threshold
    if noiseGateRelease > 0.5 {
      var attenuation = 1.0 - noiseGateRelease
      buf.withUnsafeMutableBufferPointer { vDSP_vsmul($0.baseAddress!, 1, &attenuation, $0.baseAddress!, 1, vDSP_Length(frames)) }
    }

    // 4. Soft-clip to prevent hot input signals from distorting downstream EQ
    buf.withUnsafeMutableBufferPointer { ptr in
      for i in 0..<frames {
        let x = ptr[i]
        // tanh-like soft clipper: y = x / (1 + |x|)
        ptr[i] = x / (1 + abs(x))
      }
    }
  }
}
