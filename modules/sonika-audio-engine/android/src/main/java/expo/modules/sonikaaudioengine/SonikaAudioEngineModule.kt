package expo.modules.sonikaaudioengine

import android.content.Context
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SonikaAudioEngineModule : Module() {

  private val processor = SonikaAudioProcessor()
  private val toneGenerator = ToneGenerator()
  private var deviceCallback: AudioDeviceCallback? = null

  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("SonikaAudioEngine")

    Events("onVolumeLevel", "onAudioDevicesChanged")

    // Notifica JS quando un dispositivo audio viene collegato/scollegato
    OnStartObserving {
      if (deviceCallback == null) {
        val cb = object : AudioDeviceCallback() {
          override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>)     = emitDevices()
          override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) = emitDevices()
        }
        deviceCallback = cb
        audioManager?.registerAudioDeviceCallback(cb, null)
      }
    }

    OnStopObserving {
      deviceCallback?.let { audioManager?.unregisterAudioDeviceCallback(it) }
      deviceCallback = null
    }

    OnDestroy {
      deviceCallback?.let { audioManager?.unregisterAudioDeviceCallback(it) }
      deviceCallback = null
      toneGenerator.stop()
      processor.stop()
      appContext.reactContext?.let { SonikaForegroundService.stop(it) }
    }

    // ── getAudioDevices ───────────────────────────────────────────────────
    Function("getAudioDevices") { listExternalDevices() }

    // ── start ─────────────────────────────────────────────────────────────
    AsyncFunction("start") { options: Map<String, Any> ->
      val s = settingsFrom(options)
      processor.applySettings(s)

      processor.onVolumeLevel = { level ->
        sendEvent("onVolumeLevel", mapOf("level" to level))
      }

      processor.start(audioManager)

      // Foreground service: audio attivo anche a schermo spento
      val discrete = options["discreteMode"] as? Boolean ?: false
      appContext.reactContext?.let { SonikaForegroundService.start(it, discrete) }
    }

    // ── stop ──────────────────────────────────────────────────────────────
    AsyncFunction("stop") {
      processor.onVolumeLevel = null
      processor.stop()
      appContext.reactContext?.let { SonikaForegroundService.stop(it) }
    }

    // ── Toni puri per il test dell'udito ──────────────────────────────────
    Function("playTone") { frequency: Double, ear: String, amplitude: Double ->
      toneGenerator.play(frequency, ear, amplitude)
    }

    Function("stopTone") { toneGenerator.stop() }

    // ── Ottimizzazione batteria ────────────────────────────────────────────
    // True se il sistema può uccidere il foreground service per "risparmio":
    // l'app suggerisce all'utente di escludere Sonika dall'ottimizzazione.
    Function("isBatteryOptimized") {
      val ctx = appContext.reactContext ?: return@Function false
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
      return@Function !pm.isIgnoringBatteryOptimizations(ctx.packageName)
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
        micSource       = (patch["micSource"]       as? String)            ?: cur.micSource,
        audioOutput     = (patch["audioOutput"]     as? String)            ?: cur.audioOutput,
        audioQuality    = (patch["audioQuality"]    as? String)            ?: cur.audioQuality,
      )
      val routingChanged = merged.micSource != cur.micSource || merged.audioOutput != cur.audioOutput
      processor.applySettings(merged)
      if (routingChanged) processor.applyRouting(audioManager)
    }

    // ── isRunning ─────────────────────────────────────────────────────────
    Function("isRunning") { processor.isRunning }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private fun emitDevices() {
    sendEvent("onAudioDevicesChanged", mapOf("devices" to listExternalDevices()))
  }

  /**
   * Dispositivi audio esterni realmente collegati (Bluetooth, jack, USB).
   * Esclude mic/speaker/auricolare integrati.
   */
  private fun listExternalDevices(): List<Map<String, Any>> {
    val am = audioManager ?: return emptyList()
    val builtin = setOf(
      AudioDeviceInfo.TYPE_BUILTIN_MIC,
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
      AudioDeviceInfo.TYPE_BUILTIN_EARPIECE,
      AudioDeviceInfo.TYPE_TELEPHONY,
      AudioDeviceInfo.TYPE_FM_TUNER,
      AudioDeviceInfo.TYPE_REMOTE_SUBMIX,
    )
    return try {
      am.getDevices(AudioManager.GET_DEVICES_ALL)
        .filter { it.type !in builtin }
        .map { d ->
          mapOf(
            "id"        to d.id.toString(),
            "name"      to (d.productName?.toString()?.ifBlank { null } ?: typeLabel(d.type)),
            "type"      to mapType(d),
            "isInput"   to d.isSource,
            "isOutput"  to d.isSink,
            "connected" to true,
          )
        }
        .distinctBy { it["id"] }
    } catch (_: Exception) {
      emptyList()
    }
  }

  private fun mapType(d: AudioDeviceInfo): String = when (d.type) {
    AudioDeviceInfo.TYPE_BLUETOOTH_SCO ->
      if (d.isSource) "microphone" else "headphones"
    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
    AudioDeviceInfo.TYPE_WIRED_HEADSET,
    AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
    AudioDeviceInfo.TYPE_USB_HEADSET   -> "headphones"
    else                               -> "unknown"
  }

  private fun typeLabel(type: Int): String = when (type) {
    AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "Dispositivo Bluetooth"
    AudioDeviceInfo.TYPE_WIRED_HEADSET,
    AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Cuffie con filo"
    AudioDeviceInfo.TYPE_USB_HEADSET,
    AudioDeviceInfo.TYPE_USB_DEVICE -> "Dispositivo USB"
    else -> "Dispositivo audio"
  }

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
      monoChannel     = if ((d["monoChannel"] as? String) == "right") 1 else 0,
      micSource       = d["micSource"]       as? String ?: "smartphone",
      audioOutput     = d["audioOutput"]     as? String ?: "bluetooth_headphones",
      audioQuality    = d["audioQuality"]    as? String ?: "low_latency",
    )
  }

  @Suppress("UNCHECKED_CAST")
  private fun bandsFrom(d: Map<String, Any>, key: String): FloatArray {
    val list = d[key] as? List<Map<String, Any>> ?: return FloatArray(5)
    return FloatArray(5) { i -> (list.getOrNull(i)?.get("gain") as? Number)?.toFloat() ?: 0f }
  }
}
