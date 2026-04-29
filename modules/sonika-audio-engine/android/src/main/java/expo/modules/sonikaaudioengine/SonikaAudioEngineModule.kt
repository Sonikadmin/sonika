package expo.modules.sonikaaudioengine

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SonikaAudioEngineModule : Module() {

  private val processor = SonikaAudioProcessor()

  override fun definition() = ModuleDefinition {
    Name("SonikaAudioEngine")

    Events("onVolumeLevel")

    // ── start ─────────────────────────────────────────────────────────────
    AsyncFunction("start") { options: Map<String, Any> ->
      val s = settingsFrom(options)
      processor.applySettings(s)

      processor.onVolumeLevel = { level ->
        sendEvent("onVolumeLevel", mapOf("level" to level))
      }

      val output = options["audioOutput"] as? String ?: "bluetooth_headphones"
      processor.start(output)
    }

    // ── stop ──────────────────────────────────────────────────────────────
    AsyncFunction("stop") {
      processor.onVolumeLevel = null
      processor.stop()
    }

    // ── updateSettings ────────────────────────────────────────────────────
    Function("updateSettings") { patch: Map<String, Any> ->
      val cur = processor.currentSettings
      val merged = cur.copy(
        leftGains       = if (patch.containsKey("leftEQ"))          bandsFrom(patch, "leftEQ")                                      else cur.leftGains,
        rightGains      = if (patch.containsKey("rightEQ"))         bandsFrom(patch, "rightEQ")                                     else cur.rightGains,
        leftVolume      = (patch["leftVolume"]      as? Number)?.toFloat() ?: cur.leftVolume,
        rightVolume     = (patch["rightVolume"]     as? Number)?.toFloat() ?: cur.rightVolume,
        amplification   = (patch["amplification"]   as? Number)?.toFloat() ?: cur.amplification,
        stereoBalance   = (patch["stereoBalance"]   as? Number)?.toFloat() ?: cur.stereoBalance,
        sonikaClean     = (patch["sonikaClean"]     as? Boolean)           ?: cur.sonikaClean,
        conversationMode= (patch["conversationMode"]as? Boolean)           ?: cur.conversationMode,
        monoMode        = (patch["monoMode"]        as? Boolean)           ?: cur.monoMode,
        monoChannel     = if (patch.containsKey("monoChannel")) (if (patch["monoChannel"] == "right") 1 else 0) else cur.monoChannel,
      )
      processor.applySettings(merged)
    }

    // ── isRunning ─────────────────────────────────────────────────────────
    Function("isRunning") { processor.isRunning }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  @Suppress("UNCHECKED_CAST")
  private fun settingsFrom(d: Map<String, Any>): AudioProcessorSettings {
    return AudioProcessorSettings(
      leftGains       = bandsFrom(d, "leftEQ"),
      rightGains      = bandsFrom(d, "rightEQ"),
      leftVolume      = (d["leftVolume"]     as? Number)?.toFloat() ?: 0.8f,
      rightVolume     = (d["rightVolume"]    as? Number)?.toFloat() ?: 0.8f,
      amplification   = (d["amplification"]  as? Number)?.toFloat() ?: 1.0f,
      stereoBalance   = (d["stereoBalance"]  as? Number)?.toFloat() ?: 0.0f,
      sonikaClean     = d["sonikaClean"]     as? Boolean ?: false,
      conversationMode= d["conversationMode"]as? Boolean ?: false,
      monoMode        = d["monoMode"]        as? Boolean ?: false,
      monoChannel     = if ((d["monoChannel"] as? String) == "right") 1 else 0
    )
  }

  @Suppress("UNCHECKED_CAST")
  private fun bandsFrom(d: Map<String, Any>, key: String): FloatArray {
    val list = d[key] as? List<Map<String, Any>> ?: return FloatArray(5)
    return FloatArray(5) { i -> (list.getOrNull(i)?.get("gain") as? Number)?.toFloat() ?: 0f }
  }
}
