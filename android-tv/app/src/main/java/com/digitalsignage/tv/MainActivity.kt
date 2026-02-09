package com.digitalsignage.tv

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Ana Activity: Yayın kodu tek sefer girilir, kaydedilir; sonra hep aynı yayın.
 * - 5 dakikada bir watchdog: oynatma donmuş/kapanmışsa otomatik yayına döner.
 * - Akıcı yayın: büyük buffer, otomatik retry.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MenuSlideTV"
        private const val PREFS = "tv_player"
        private const val KEY_BROADCAST_CODE = "broadcast_code"
        private const val KEY_DEVICE_ID = "device_id"
        /** Ayarlardan alınan API taban URL (örn. https://menuslide.com/api/proxy) */
        private const val KEY_API_BASE = "api_base"
        /** Config alınacak site (apiBaseUrl buradan gelir) */
        private const val BOOTSTRAP_BASE = "https://menuslide.com"
        private const val WATCHDOG_INTERVAL_MS = 5 * 60 * 1000L // 5 dakika
        private const val STUCK_THRESHOLD_MS = 90_000L // 1.5 dk oynatma yoksa yeniden başlat
    }

    private val prefs by lazy { getSharedPreferences(PREFS, Context.MODE_PRIVATE) }
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var screenCodeInput: View
    private lateinit var inputCode: EditText
    private lateinit var btnStart: Button
    private lateinit var labelError: TextView
    private lateinit var progressLoading: ProgressBar
    private lateinit var playerView: PlayerView

    private var exoPlayer: ExoPlayer? = null
    private var resolveJob: Job? = null
    private var currentStreamUrl: String? = null
    private var lastPlayingTimeMs: Long = 0
    private var watchdogRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        bindViews()
        keepScreenOn()
        applyFullscreenWhenPlaying(false)

        // Kod tek sefer: kayıtlı varsa bir daha sorma, direkt yayın
        val savedCode = prefs.getString(KEY_BROADCAST_CODE, null)?.trim()
        if (!savedCode.isNullOrEmpty()) {
            showInputScreen(false)
            showLoading(true)
            resolveAndPlay(savedCode)
            startWatchdog()
        } else {
            showInputScreen(true)
            showLoading(false)
            btnStart.setOnClickListener { onStartClicked() }
            inputCode.setOnEditorActionListener { _, _, _ ->
                onStartClicked()
                true
            }
        }
    }

    private fun bindViews() {
        screenCodeInput = findViewById(R.id.screen_code_input)
        inputCode = findViewById(R.id.input_code)
        btnStart = findViewById(R.id.btn_start)
        labelError = findViewById(R.id.label_error)
        progressLoading = findViewById(R.id.progress_loading)
        playerView = findViewById(R.id.player_view)
    }

    private fun keepScreenOn() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    @SuppressLint("InlinedApi")
    private fun applyFullscreenWhenPlaying(playing: Boolean) {
        if (playing) {
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
        } else {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }
    }

    private fun showInputScreen(show: Boolean) {
        screenCodeInput.visibility = if (show) View.VISIBLE else View.GONE
    }

    private fun showLoading(show: Boolean) {
        progressLoading.visibility = if (show) View.VISIBLE else View.GONE
    }

    private fun showError(message: String?) {
        if (!message.isNullOrEmpty()) {
            labelError.text = message
            labelError.visibility = View.VISIBLE
        } else {
            labelError.visibility = View.GONE
        }
    }

    private fun onStartClicked() {
        val code = inputCode.text?.toString()?.trim().orEmpty()
        if (code.isEmpty()) {
            showError(getString(R.string.hint_code))
            return
        }
        showError(null)
        // 1 sefer girilen kod kalıcı kaydedilir, bir daha sorulmaz
        prefs.edit().putString(KEY_BROADCAST_CODE, code).apply()
        showLoading(true)
        resolveAndPlay(code)
        startWatchdog()
    }

    private fun startWatchdog() {
        stopWatchdog()
        watchdogRunnable = object : Runnable {
            override fun run() {
                checkAndRecoverPlayback()
                mainHandler.postDelayed(this, WATCHDOG_INTERVAL_MS)
            }
        }
        mainHandler.postDelayed(watchdogRunnable!!, WATCHDOG_INTERVAL_MS)
    }

    private fun stopWatchdog() {
        watchdogRunnable?.let { mainHandler.removeCallbacks(it) }
        watchdogRunnable = null
    }

    /**
     * Her 5 dakikada bir: oynatma donmuş veya kapanmışsa otomatik yayına dön.
     */
    private fun checkAndRecoverPlayback() {
        val code = prefs.getString(KEY_BROADCAST_CODE, null)?.trim() ?: return
        val url = currentStreamUrl ?: return
        val player = exoPlayer ?: run {
            Log.w(TAG, "Watchdog: player null, restarting stream")
            resolveAndPlay(code)
            return
        }
        val state = player.playbackState
        val playWhenReady = player.playWhenReady
        val now = System.currentTimeMillis()
        when (state) {
            Player.STATE_READY -> if (playWhenReady) lastPlayingTimeMs = now
            Player.STATE_BUFFERING -> { /* normal, keep lastPlayingTimeMs */ }
            Player.STATE_IDLE, Player.STATE_ENDED -> {
                if (now - lastPlayingTimeMs > STUCK_THRESHOLD_MS || state == Player.STATE_IDLE) {
                    Log.w(TAG, "Watchdog: state=$state, restarting stream")
                    releasePlayer()
                    startPlayback(url)
                }
            }
        }
        if (playWhenReady && state != Player.STATE_IDLE && state != Player.STATE_ENDED) {
            lastPlayingTimeMs = now
        } else if (now - lastPlayingTimeMs > STUCK_THRESHOLD_MS && state != Player.STATE_READY) {
            Log.w(TAG, "Watchdog: no progress for ${(now - lastPlayingTimeMs) / 1000}s, restarting")
            releasePlayer()
            resolveAndPlay(code)
        }
    }

    private fun resolveAndPlay(code: String) {
        resolveJob?.cancel()
        resolveJob = scope.launch {
            val streamUrl = withContext(Dispatchers.IO) { resolveStreamUrl(code) }
            if (streamUrl != null) {
                currentStreamUrl = streamUrl
                startPlayback(streamUrl)
                showInputScreen(false)
                showLoading(false)
                lastPlayingTimeMs = System.currentTimeMillis()
            } else {
                showLoading(false)
                showInputScreen(true)
                showError(getString(R.string.error_invalid_response))
            }
        }
    }

    /** Config'ten API taban URL al (önbelleğe alır). IO thread'de çağrılmalı. */
    private fun getApiBaseUrl(): String {
        val cached = prefs.getString(KEY_API_BASE, null)?.trim()
        if (!cached.isNullOrEmpty()) return cached.trimEnd('/')
        return try {
            val configUrl = "$BOOTSTRAP_BASE/api/tv-app-config"
            val request = Request.Builder().url(configUrl).get().build()
            val client = OkHttpClient.Builder().connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS).build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val json = response.body?.string() ?: ""
                val obj = JSONObject(json)
                val base = obj.optString("apiBaseUrl", "").trim()
                val url = if (base.isNotEmpty()) base.trimEnd('/') else "$BOOTSTRAP_BASE/api/proxy"
                prefs.edit().putString(KEY_API_BASE, url).apply()
                Log.d(TAG, "api base from config: $url")
                url
            } else {
                val fallback = "$BOOTSTRAP_BASE/api/proxy"
                Log.w(TAG, "config failed ${response.code}, using $fallback")
                fallback
            }
        } catch (e: Exception) {
            val fallback = "$BOOTSTRAP_BASE/api/proxy"
            Log.e(TAG, "config fetch error, using $fallback", e)
            fallback
        }
    }

    private fun resolveStreamUrl(code: String): String? {
        return try {
            val apiBase = getApiBaseUrl()
            val resolveUrl = "$apiBase/player/resolve"
            val deviceId = getOrCreateDeviceId()
            val body = JSONObject().apply {
                put("code", code)
                put("deviceId", deviceId)
            }.toString()
            val request = Request.Builder()
                .url(resolveUrl)
                .post(body.toRequestBody("application/json".toMediaType()))
                .addHeader("Content-Type", "application/json")
                .build()
            val client = OkHttpClient.Builder()
                .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(20, java.util.concurrent.TimeUnit.SECONDS)
                .build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.e(TAG, "resolve failed: ${response.code} $resolveUrl")
                return null
            }
            val json = response.body?.string() ?: return null
            val obj = JSONObject(json)
            if (obj.has("streamUrl")) {
                obj.getString("streamUrl").takeIf { it.isNotEmpty() }
            } else null
        } catch (e: Exception) {
            Log.e(TAG, "resolve error", e)
            null
        }
    }

    private fun getOrCreateDeviceId(): String {
        var id = prefs.getString(KEY_DEVICE_ID, null)
        if (id.isNullOrEmpty()) {
            id = UUID.randomUUID().toString()
            prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        }
        return id
    }

    @UnstableApi
    private fun startPlayback(streamUrl: String) {
        releasePlayer()
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(20_000)
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(30_000, 120_000, 5_000, 5_000)
            .build()
        val mediaSourceFactory = DefaultMediaSourceFactory(this).setDataSourceFactory(httpDataSourceFactory)
        exoPlayer = ExoPlayer.Builder(this)
            .setMediaSourceFactory(mediaSourceFactory)
            .setLoadControl(loadControl)
            .build()
            .also { player ->
                playerView.player = player
                playerView.useController = false
                playerView.visibility = View.VISIBLE
                applyFullscreenWhenPlaying(true)

                player.setMediaItem(MediaItem.fromUri(streamUrl))
                player.prepare()
                player.playWhenReady = true
                player.repeatMode = Player.REPEAT_MODE_ALL

                player.addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        when (playbackState) {
                            Player.STATE_READY -> lastPlayingTimeMs = System.currentTimeMillis()
                            Player.STATE_BUFFERING -> { }
                            Player.STATE_IDLE -> {
                                if (isNetworkAvailable()) {
                                    player.prepare()
                                    player.playWhenReady = true
                                }
                            }
                            Player.STATE_ENDED -> { player.seekTo(0); player.play() }
                        }
                    }
                    override fun onPlayerError(error: PlaybackException) {
                        Log.e(TAG, "playback error", error)
                        if (isNetworkAvailable()) player.prepare()
                    }
                })
            }
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val cap = cm.getNetworkCapabilities(network) ?: return false
        return cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun releasePlayer() {
        exoPlayer?.release()
        exoPlayer = null
        playerView.player = null
        playerView.visibility = View.GONE
    }

    override fun onDestroy() {
        stopWatchdog()
        resolveJob?.cancel()
        releasePlayer()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        super.onBackPressed()
    }
}
