package com.digitalsignage.tv.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Process
import androidx.core.app.NotificationCompat
import com.digitalsignage.tv.BuildConfig
import com.digitalsignage.tv.data.api.ApiService
import com.digitalsignage.tv.data.api.HeartbeatRequest
import com.digitalsignage.tv.data.repository.DeviceRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class HeartbeatService : Service() {

    @Inject lateinit var api: ApiService
    @Inject lateinit var repository: DeviceRepository

    private val scope = CoroutineScope(Dispatchers.IO + Job())
    private var heartbeatJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification())
        heartbeatJob = scope.launch {
            while (true) {
                try { sendHeartbeatSuspend() } catch (_: Exception) { }
                delay(60_000)
            }
        }
    }

    override fun onDestroy() {
        heartbeatJob?.cancel()
        super.onDestroy()
    }

    private suspend fun sendHeartbeatSuspend() {
        val token = repository.getDeviceToken() ?: return
        val runtime = Runtime.getRuntime()
        val ramUsageMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
        val req = HeartbeatRequest(
            deviceToken = token,
            ramUsageMb = ramUsageMb,
            playbackStatus = "playing",
            appVersion = BuildConfig.VERSION_NAME,
            lastError = null
        )
        api.heartbeat(req)
    }

    private fun createNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(com.digitalsignage.tv.R.string.notification_channel_playback),
                NotificationManager.IMPORTANCE_LOW
            ).apply { setShowBadge(false) }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(com.digitalsignage.tv.R.string.app_name))
            .setContentText(getString(com.digitalsignage.tv.R.string.notification_playback_running))
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "heartbeat"
        private const val NOTIFICATION_ID = 9001
    }
}
