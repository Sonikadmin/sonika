import ExpoModulesCore
import AVFoundation

public class SonikaAudioEngineModule: Module {

  private let processor = SonikaAudioProcessor()
  private var volumeDispatch: DispatchSourceTimer?

  // MARK: - Expo Module definition

  public func definition() -> ModuleDefinition {
    Name("SonikaAudioEngine")

    Events("onVolumeLevel")

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
    }

    // ── isRunning ──────────────────────────────────────────────────────────
    Function("isRunning") { [weak self] () -> Bool in
      self?.processor.isRunning ?? false
    }
  }

  // MARK: - Helpers

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
