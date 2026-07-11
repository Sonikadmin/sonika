import ExpoModulesCore
import AVFoundation

/// Toni puri per il test dell'udito (loop senza click: cicli interi nel buffer).
final class TonePlayer {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private var prepared = false

  func play(frequency: Double, ear: String, amplitude: Double) {
    stop()
    let sr = 44100.0
    let cycles = max(1.0, frequency.rounded())
    let frames = AVAudioFrameCount((cycles * sr / frequency).rounded())
    guard frequency > 0,
          let format = AVAudioFormat(standardFormatWithSampleRate: sr, channels: 2),
          let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames),
          let data = buffer.floatChannelData
    else { return }
    buffer.frameLength = frames

    let amp = Float(min(max(amplitude, 0), 1))
    let fade = min(Int(frames) / 4, Int(sr / 50)) // 20 ms anti-click
    for i in 0..<Int(frames) {
      var v = Float(sin(2.0 * .pi * frequency * Double(i) / sr)) * amp
      if i < fade { v *= Float(i) / Float(fade) }
      data[0][i] = ear == "right" ? 0 : v
      data[1][i] = ear == "left" ? 0 : v
    }

    if !prepared {
      engine.attach(player)
      engine.connect(player, to: engine.mainMixerNode, format: format)
      prepared = true
    }
    try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
    try? AVAudioSession.sharedInstance().setActive(true)
    try? engine.start()
    player.scheduleBuffer(buffer, at: nil, options: .loops)
    player.play()
  }

  func stop() {
    if prepared {
      player.stop()
      engine.stop()
    }
  }
}

public class SonikaAudioEngineModule: Module {

  private let processor = SonikaAudioProcessor()
  private let tonePlayer = TonePlayer()
  private var volumeDispatch: DispatchSourceTimer?
  private var routeObserver: NSObjectProtocol?

  // MARK: - Expo Module definition

  public func definition() -> ModuleDefinition {
    Name("SonikaAudioEngine")

    Events("onVolumeLevel", "onAudioDevicesChanged")

    // Notifica JS quando un dispositivo audio viene collegato/scollegato
    OnStartObserving { [weak self] in
      guard let self, self.routeObserver == nil else { return }
      self.routeObserver = NotificationCenter.default.addObserver(
        forName: AVAudioSession.routeChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        guard let self else { return }
        self.sendEvent("onAudioDevicesChanged", ["devices": self.listExternalDevices()])
      }
    }

    OnStopObserving { [weak self] in
      if let obs = self?.routeObserver {
        NotificationCenter.default.removeObserver(obs)
        self?.routeObserver = nil
      }
    }

    // ── getAudioDevices ────────────────────────────────────────────────────
    Function("getAudioDevices") { [weak self] () -> [[String: Any]] in
      self?.listExternalDevices() ?? []
    }

    // ── start ──────────────────────────────────────────────────────────────
    AsyncFunction("start") { [weak self] (options: [String: Any]) throws in
      guard let self else { return }

      let s = self.settingsFrom(options)
      self.processor.applySettings(s)

      let output = options["audioOutput"] as? String ?? "bluetooth_headphones"
      try self.processor.start(output: output)

      // Forward volume level events to JS ~12 times per second
      self.processor.onVolumeLevel = { [weak self] level in
        self?.sendEvent("onVolumeLevel", ["level": level])
      }
    }

    // ── stop ───────────────────────────────────────────────────────────────
    AsyncFunction("stop") { [weak self] in
      self?.processor.onVolumeLevel = nil
      self?.processor.stop()
    }

    // ── updateSettings ─────────────────────────────────────────────────────
    Function("updateSettings") { [weak self] (patch: [String: Any]) in
      guard let self else { return }
      var s = self.processor.settings
      self.applyPatch(patch, into: &s)
      self.processor.applySettings(s)

      // Routing dinamico se cambiano sorgente mic o uscita
      if patch["micSource"] != nil || patch["audioOutput"] != nil {
        let mic = patch["micSource"]   as? String ?? "smartphone"
        let out = patch["audioOutput"] as? String ?? "bluetooth_headphones"
        self.processor.applyRouting(micSource: mic, audioOutput: out)
      }
    }

    // ── isRunning ──────────────────────────────────────────────────────────
    Function("isRunning") { [weak self] () -> Bool in
      self?.processor.isRunning ?? false
    }

    // ── Toni puri per il test dell'udito ──────────────────────────────────
    Function("playTone") { [weak self] (frequency: Double, ear: String, amplitude: Double) in
      self?.tonePlayer.play(frequency: frequency, ear: ear, amplitude: amplitude)
    }

    Function("stopTone") { [weak self] in
      self?.tonePlayer.stop()
    }
  }

  // MARK: - Helpers

  /// Dispositivi audio esterni realmente collegati (Bluetooth, jack, USB).
  /// Esclude mic/speaker/ricevitore integrati.
  private func listExternalDevices() -> [[String: Any]] {
    let session = AVAudioSession.sharedInstance()
    var devices: [[String: Any]] = []
    var seen = Set<String>()

    let builtin: Set<AVAudioSession.Port> = [.builtInMic, .builtInSpeaker, .builtInReceiver]

    for input in session.availableInputs ?? [] where !builtin.contains(input.portType) {
      guard !seen.contains(input.uid) else { continue }
      seen.insert(input.uid)
      devices.append([
        "id":        input.uid,
        "name":      input.portName,
        "type":      mapPortType(input.portType, isInput: true),
        "isInput":   true,
        "isOutput":  false,
        "connected": true,
      ])
    }

    for output in session.currentRoute.outputs where !builtin.contains(output.portType) {
      guard !seen.contains(output.uid) else { continue }
      seen.insert(output.uid)
      devices.append([
        "id":        output.uid,
        "name":      output.portName,
        "type":      mapPortType(output.portType, isInput: false),
        "isInput":   false,
        "isOutput":  true,
        "connected": true,
      ])
    }

    return devices
  }

  private func mapPortType(_ port: AVAudioSession.Port, isInput: Bool) -> String {
    switch port {
    case .bluetoothHFP, .bluetoothLE:
      return isInput ? "microphone" : "headphones"
    case .bluetoothA2DP, .headphones, .headsetMic, .usbAudio:
      return isInput ? "microphone" : "headphones"
    default:
      return "unknown"
    }
  }

  private func settingsFrom(_ d: [String: Any]) -> AudioProcessorSettings {
    var s = AudioProcessorSettings()

    if let leftBands = d["leftEQ"] as? [[String: Any]] {
      s.leftGains = leftBands.map { ($0["gain"] as? Float) ?? 0 }
    }
    if let rightBands = d["rightEQ"] as? [[String: Any]] {
      s.rightGains = rightBands.map { ($0["gain"] as? Float) ?? 0 }
    }

    s.leftVolume     = (d["leftVolume"]     as? Float) ?? 0.8
    s.rightVolume    = (d["rightVolume"]    as? Float) ?? 0.8
    s.amplification  = (d["amplification"]  as? Float) ?? 1.0
    s.stereoBalance  = (d["stereoBalance"]  as? Float) ?? 0.0
    s.sonikaClean    = (d["sonikaClean"]    as? Bool)  ?? false
    s.conversationMode = (d["conversationMode"] as? Bool) ?? false
    s.monoMode       = (d["monoMode"]       as? Bool)  ?? false
    s.monoChannel    = ((d["monoChannel"]   as? String) == "right") ? 1 : 0

    return s
  }

  private func applyPatch(_ patch: [String: Any], into s: inout AudioProcessorSettings) {
    if let leftBands = patch["leftEQ"] as? [[String: Any]] {
      s.leftGains = leftBands.map { ($0["gain"] as? Float) ?? 0 }
    }
    if let rightBands = patch["rightEQ"] as? [[String: Any]] {
      s.rightGains = rightBands.map { ($0["gain"] as? Float) ?? 0 }
    }
    if let v = patch["leftVolume"]     as? Float { s.leftVolume    = v }
    if let v = patch["rightVolume"]    as? Float { s.rightVolume   = v }
    if let v = patch["amplification"]  as? Float { s.amplification = v }
    if let v = patch["stereoBalance"]  as? Float { s.stereoBalance = v }
    if let v = patch["sonikaClean"]    as? Bool  { s.sonikaClean   = v }
    if let v = patch["conversationMode"] as? Bool { s.conversationMode = v }
    if let v = patch["monoMode"]       as? Bool  { s.monoMode      = v }
    if let v = patch["monoChannel"]    as? String { s.monoChannel  = v == "right" ? 1 : 0 }
  }
}
