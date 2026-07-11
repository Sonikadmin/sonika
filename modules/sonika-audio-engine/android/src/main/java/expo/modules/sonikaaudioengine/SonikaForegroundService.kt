package expo.modules.sonikaaudioengine

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Foreground service che tiene vivo il flusso audio a schermo spento.
 *
 * L'elaborazione audio gira nelle coroutine del processo dell'app: questo
 * service serve a dichiarare al sistema l'uso del microfono in foreground
 * (obbligatorio da Android 14 per registrare in background) e a mostrare
 * la notifica persistente.
 *
 * In modalità discreta la notifica usa un canale a importanza minima:
 * niente suoni, niente banner, solo la voce nel pannello notifiche.
 */
class SonikaForegroundService : Service() {

  companion object {
    private const val NOTIFICATION_ID = 1001
    private const val CHANNEL_NORMAL = "sonika_audio"
    private const val CHANNEL_DISCRETE = "sonika_audio_discrete"
    const val EXTRA_DISCRETE = "discrete"

    fun start(context: Context, discrete: Boolean) {
      val intent = Intent(context, SonikaForegroundService::class.java)
        .putExtra(EXTRA_DISCRETE, discrete)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, SonikaForegroundService::class.java))
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val discrete = intent?.getBooleanExtra(EXTRA_DISCRETE, false) ?: false
    val channelId = if (discrete) CHANNEL_DISCRETE else CHANNEL_NORMAL
    createChannel(channelId, discrete)

    val notification = buildNotification(channelId, discrete)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    return START_NOT_STICKY
  }

  private fun buildNotification(channelId: String, discrete: Boolean): Notification {
    // Tocca la notifica → riapre l'app
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this, 0, it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    return NotificationCompat.Builder(this, channelId)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(if (discrete) "Sonika" else "Sonika è attivo")
      .setContentText(
        if (discrete) "" else "Amplificazione in corso — tocca per aprire",
      )
      .setOngoing(true)
      .setContentIntent(contentIntent)
      .setPriority(
        if (discrete) NotificationCompat.PRIORITY_MIN else NotificationCompat.PRIORITY_LOW,
      )
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  private fun createChannel(channelId: String, discrete: Boolean) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      channelId,
      if (discrete) "Sonika (discreto)" else "Sonika attivo",
      if (discrete) NotificationManager.IMPORTANCE_MIN else NotificationManager.IMPORTANCE_LOW,
    ).apply {
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }
}
