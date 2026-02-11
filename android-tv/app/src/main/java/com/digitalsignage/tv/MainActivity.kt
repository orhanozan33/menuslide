package com.digitalsignage.tv

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebSettings
import android.webkit.WebViewClient
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
import android.app.ActivityManager
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import android.os.PowerManager
import androidx.appcompat.app.AlertDialog
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import android.os.Build
import androidx.annotation.RequiresApi
import android.webkit.RenderProcessGoneDetail
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import androidx.core.content.FileProvider
import java.io.File
import android.app.AlarmManager
import android.app.PendingIntent
import android.app.ProgressDialog
import android.os.SystemClock
import androidx.core.content.ContextCompat

/**
 * Ana Activity: Yayın kodu tek sefer girilir, kaydedilir; sonra hep aynı yayın.
 * - 1 dakikada bir watchdog: oynatma donmuş/kapanmışsa otomatik yayına döner.
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
        private const val WATCHDOG_INTERVAL_MS = 1 * 60 * 1000L // 1 dakika (erken donma müdahalesi)
        private const val STUCK_THRESHOLD_MS = 75_000L // ~1.25 dk oynatma yoksa yeniden başlat
        /** WebView: stick donma öncesi 2 dk yenile */
        private const val WEBVIEW_RELOAD_INTERVAL_MS = 2 * 60 * 1000L
        /** Otomatik yeniden açılma: uygulama kapanınca 2 dk sonra tekrar açılsın */
        private const val RESTART_ALARM_INTERVAL_MS = 2 * 60 * 1000L
    }

    private val prefs by lazy { getSharedPreferences(PREFS, Context.MODE_PRIVATE) }
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var screenCodeInput: View
    private lateinit var inputCode: EditText
    private lateinit var btnStart: Button
    private lateinit var labelError: TextView
    private lateinit var progressLoading: ProgressBar
    private lateinit var displayContainer: View
    private var displayWebView: WebView? = null
    private lateinit var webviewLoading: ProgressBar
    private lateinit var playerView: PlayerView

    private var exoPlayer: ExoPlayer? = null
    private var resolveJob: Job? = null
    private var currentStreamUrl: String? = null
    private var lastPlayingTimeMs: Long = 0
    private var lastWebViewReloadMs: Long = 0
    private var watchdogRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        bindViews()
        keepScreenOn()
        applyFullscreenWhenPlaying(false)

        val savedCode = prefs.getString(KEY_BROADCAST_CODE, null)?.trim()
        if (!savedCode.isNullOrEmpty()) {
            showInputScreen(false)
            showLoading(true)
            loadConfigAndCheckVersion { canProceed ->
                mainHandler.post {
                    if (canProceed) {
                        requestBatteryOptimizationExemption {
                            prefs.edit().putBoolean(RestartReceiver.KEY_USER_EXIT, false).apply()
                            resolveAndPlay(savedCode)
                            startWatchdog()
                            scheduleRestartAlarm()
                        }
                    } else {
                        showLoading(false)
                        showInputScreen(true)
                    }
                }
            }
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

    /** Config alır, API base kaydeder; uzaktan sürüm kontrolü yapar. Güncelleme zorunluysa onResult(false). */
    private fun loadConfigAndCheckVersion(onResult: (canProceed: Boolean) -> Unit) {
        scope.launch {
            val canProceed = withContext(Dispatchers.IO) {
                try {
                    val request = Request.Builder().url("$BOOTSTRAP_BASE/api/tv-app-config?t=${System.currentTimeMillis()}").get().build()
                    val client = OkHttpClient.Builder().connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS).build()
                    val response = client.newCall(request).execute()
                    if (!response.isSuccessful) return@withContext true
                    val json = response.body?.string() ?: return@withContext true
                    val obj = org.json.JSONObject(json)
                    val base = obj.optString("apiBaseUrl", "").trim()
                    if (base.isNotEmpty()) prefs.edit().putString(KEY_API_BASE, base.trimEnd('/')).apply()
                    val minCode = if (obj.has("minVersionCode")) obj.optInt("minVersionCode", 0).takeIf { it > 0 } else null
                    val latestCode = if (obj.has("latestVersionCode")) obj.optInt("latestVersionCode", 0).takeIf { it > 0 } else null
                    val currentCode = BuildConfig.VERSION_CODE
                    Log.d(TAG, "Version check: current=$currentCode min=$minCode latest=$latestCode")
                    if (minCode != null && currentCode < minCode) {
                        val downloadUrl = obj.optString("downloadUrl", "").trim()
                        mainHandler.post {
                            showUpdateRequiredDialog(downloadUrl)
                            onResult(false)
                        }
                        return@withContext false
                    }
                    if (latestCode != null && currentCode < latestCode) {
                        val downloadUrl = obj.optString("downloadUrl", "").trim()
                        val versionName = obj.optString("latestVersionName", "")
                        mainHandler.post { showUpdateAvailableDialog(downloadUrl, versionName, onResult) }
                        return@withContext false
                    }
                    true
                } catch (e: Exception) {
                    Log.e(TAG, "config/version check error", e)
                    true
                }
            }
            if (canProceed) onResult(true)
        }
    }

    private fun showUpdateRequiredDialog(downloadUrl: String) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.update_required_title))
            .setMessage(getString(R.string.update_required_message))
            .setCancelable(false)
            .setPositiveButton(getString(R.string.btn_update)) { _, _ ->
                downloadApkAndInstall(downloadUrl)
            }
            .show()
    }

    private fun showUpdateAvailableDialog(downloadUrl: String, versionName: String, onResult: (Boolean) -> Unit) {
        val msg = if (versionName.isNotEmpty()) {
            getString(R.string.update_available_message) + " (v$versionName)"
        } else {
            getString(R.string.update_available_message)
        }
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.update_available_title))
            .setMessage(msg)
            .setPositiveButton(getString(R.string.btn_update)) { _, _ ->
                downloadApkAndInstall(downloadUrl)
                onResult(false)
            }
            .setNegativeButton(getString(R.string.btn_skip)) { _, _ -> onResult(true) }
            .setOnCancelListener { onResult(true) }
            .show()
    }

    /**
     * APK'yı indirir, kurulum ekranını açar. Eski sürüm kaldırılıp yenisi kurulur;
     * yayın kodu SharedPreferences'ta kalır, uygulama tekrar açılınca kod istemeden yayına devam eder.
     */
    private fun downloadApkAndInstall(downloadUrl: String) {
        val fullUrl = if (downloadUrl.startsWith("http")) downloadUrl else "$BOOTSTRAP_BASE$downloadUrl"
        val progress = ProgressDialog.show(this, null, getString(R.string.update_downloading), true, false)
        scope.launch {
            val file = withContext(Dispatchers.IO) {
                try {
                    val client = OkHttpClient.Builder()
                        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                        .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                        .build()
                    val request = Request.Builder().url(fullUrl).get().build()
                    val response = client.newCall(request).execute()
                    if (!response.isSuccessful || response.body == null) return@withContext null
                    val apkFile = File(cacheDir, "update.apk")
                    response.body!!.byteStream().use { input ->
                        apkFile.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                    apkFile
                } catch (e: Exception) {
                    Log.e(TAG, "APK download failed", e)
                    null
                }
            }
            mainHandler.post {
                progress.dismiss()
                if (file != null && file.exists()) {
                    try {
                        val uri = FileProvider.getUriForFile(
                            this@MainActivity,
                            "${packageName}.fileprovider",
                            file
                        )
                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(uri, "application/vnd.android.package-archive")
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        android.widget.Toast.makeText(
                            this@MainActivity,
                            getString(R.string.update_install_ready),
                            android.widget.Toast.LENGTH_LONG
                        ).show()
                        finish()
                    } catch (e: Exception) {
                        Log.e(TAG, "Install intent failed", e)
                        openDownloadUrl(fullUrl)
                    }
                } else {
                    android.widget.Toast.makeText(
                        this@MainActivity,
                        getString(R.string.update_download_failed),
                        android.widget.Toast.LENGTH_SHORT
                    ).show()
                    openDownloadUrl(fullUrl)
                }
            }
        }
    }

    /** İndirme başarısız olursa tarayıcıda / indirme yöneticisinde açar */
    private fun openDownloadUrl(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (e: Exception) {
            Log.e(TAG, "Open download URL failed", e)
        }
    }

    /** Kesintisiz yayın için pil optimizasyonundan muafiyet iste. TV'de diyalog bazen görünmediği için önce doğrudan sistem ekranını açmayı dene. */
    private fun requestBatteryOptimizationExemption(onDone: () -> Unit) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            onDone()
            return
        }
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (pm.isIgnoringBatteryOptimizations(packageName)) {
            onDone()
            return
        }
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:$packageName")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            Log.d(TAG, "Opened battery optimization exemption screen")
        } catch (e: Exception) {
            Log.e(TAG, "Battery optimization intent failed, showing dialog", e)
            AlertDialog.Builder(this)
                .setTitle(getString(R.string.permission_battery_title))
                .setMessage(getString(R.string.permission_battery_message))
                .setPositiveButton(getString(R.string.btn_allow)) { _, _ ->
                    try {
                        val intent2 = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = Uri.parse("package:$packageName")
                        }
                        startActivity(intent2)
                    } catch (e2: Exception) {
                        Log.e(TAG, "Battery optimization intent failed", e2)
                    }
                    onDone()
                }
                .setNegativeButton(getString(R.string.btn_not_now)) { _, _ -> onDone() }
                .setOnCancelListener { onDone() }
                .show()
            return
        }
        onDone()
    }

    private fun bindViews() {
        screenCodeInput = findViewById(R.id.screen_code_input)
        inputCode = findViewById(R.id.input_code)
        btnStart = findViewById(R.id.btn_start)
        labelError = findViewById(R.id.label_error)
        progressLoading = findViewById(R.id.progress_loading)
        playerView = findViewById(R.id.player_view)
        inputCode.setTextColor(android.graphics.Color.BLACK)
        inputCode.setHintTextColor(android.graphics.Color.GRAY)
        displayContainer = findViewById(R.id.display_container)
        displayWebView = findViewById(R.id.display_webview)
        webviewLoading = findViewById(R.id.webview_loading)
        displayContainer.visibility = View.GONE
        setupDisplayWebView(displayWebView!!)
    }

    /** WebView: Stick/TV GPU kilitlenmesini önlemek için her cihazda yazılım katmanı + bellek tasarrufu. */
    private fun setupDisplayWebView(webView: WebView) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_NO_CACHE
            setGeolocationEnabled(false)
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(false)
            builtInZoomControls = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = false
            }
        }
        // Her cihazda software layer: stick/TV GPU sürücüleri kilitlenmesin (sistem donması önlemi)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
            webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
            Log.d(TAG, "WebView using software layer (GPU freeze prevention)")
        }
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                webviewLoading.visibility = View.VISIBLE
            }
            override fun onPageFinished(view: WebView?, url: String?) {
                webviewLoading.visibility = View.GONE
            }
            @RequiresApi(Build.VERSION_CODES.O)
            override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
                Log.w(TAG, "WebView render process gone (donma/çökme), WebView yeniden oluşturuluyor")
                val url = currentStreamUrl
                if (url.isNullOrEmpty() || !url.contains("/display/")) return true
                mainHandler.post { replaceDisplayWebViewAndLoad(url) }
                return true
            }
        }
    }

    /** Render process çöktüğünde aynı WebView tekrar yüklenmez; yeni WebView oluşturulup URL yüklenir (donma/kapanma azalır). */
    private fun replaceDisplayWebViewAndLoad(url: String) {
        val oldWebView = displayWebView ?: return
        val parent = displayContainer as? ViewGroup ?: return
        webviewLoading.visibility = View.VISIBLE
        val newWebView = WebView(this).apply {
            id = R.id.display_webview
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            setBackgroundColor(android.graphics.Color.BLACK)
        }
        setupDisplayWebView(newWebView)
        parent.addView(newWebView, 0)
        parent.removeView(oldWebView)
        try {
            oldWebView.destroy()
        } catch (e: Exception) {
            Log.e(TAG, "Old WebView destroy", e)
        }
        displayWebView = newWebView
        newWebView.loadUrl(url)
        lastWebViewReloadMs = System.currentTimeMillis()
        Log.d(TAG, "Display WebView recreated and loading: $url")
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
        hideKeyboard()
        val code = inputCode.text?.toString()?.trim().orEmpty()
        if (code.isEmpty()) {
            showError(getString(R.string.hint_code))
            return
        }
        showError(null)
        prefs.edit().putString(KEY_BROADCAST_CODE, code).commit()
        showLoading(true)
        // Önce uzaktan sürüm kontrolü; güncelleme zorunluysa yayına geçme
        loadConfigAndCheckVersion { canProceed ->
            mainHandler.post {
                if (!canProceed) {
                    showLoading(false)
                    return@post
                }
                // Kesintisiz yayın için pil optimizasyonu muafiyeti öner (izin verilirse yayın başlar)
                requestBatteryOptimizationExemption {
                    prefs.edit().putBoolean(RestartReceiver.KEY_USER_EXIT, false).apply()
                    resolveAndPlay(code)
                    startWatchdog()
                    scheduleRestartAlarm()
                }
            }
        }
    }

    private fun hideKeyboard() {
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager ?: return
        val token = inputCode.windowToken ?: currentFocus?.windowToken ?: return
        imm.hideSoftInputFromWindow(token, 0)
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
     * WebView (display) modunda: periyodik reload ile donma/siyah ekran önlenir.
     */
    private fun checkAndRecoverPlayback() {
        val code = prefs.getString(KEY_BROADCAST_CODE, null)?.trim() ?: return
        val url = currentStreamUrl ?: return
        val now = System.currentTimeMillis()

        // Display sayfası (WebView) modu: donma önlemi için periyodik yenile (stick = hep 2 dk)
        if (url.contains("/display/")) {
            val interval = WEBVIEW_RELOAD_INTERVAL_MS
            if (now - lastWebViewReloadMs >= interval) {
                Log.d(TAG, "Watchdog: WebView reload (freeze recovery)")
                lastWebViewReloadMs = now
                displayWebView?.reload()
            }
            return
        }

        val player = exoPlayer ?: run {
            Log.w(TAG, "Watchdog: player null, restarting stream")
            resolveAndPlay(code)
            return
        }
        val state = player.playbackState
        val playWhenReady = player.playWhenReady
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

    /** Display URL'ine her zaman ?lite=1&low=1 ekler — hedef sadece stick, donma/kapanma önleme. */
    private fun ensureDisplayUrlWithLite(url: String): String {
        if (!url.contains("/display/")) return url
        val hasQuery = url.contains("?")
        val out = url + if (hasQuery) "&lite=1&low=1" else "?lite=1&low=1"
        return out
    }

    private fun resolveAndPlay(code: String) {
        resolveJob?.cancel()
        resolveJob = scope.launch {
            val (url, errorMsg) = withContext(Dispatchers.IO) { resolveStreamUrl(code) }
            if (!url.isNullOrEmpty()) {
                val urlToLoad = ensureDisplayUrlWithLite(url)
                currentStreamUrl = urlToLoad
                startPlayback(urlToLoad)
                showInputScreen(false)
                showLoading(false)
                lastPlayingTimeMs = System.currentTimeMillis()
            } else {
                stopPlaybackKeepAliveService()
                showLoading(false)
                showInputScreen(true)
                showError(errorMsg ?: getString(R.string.error_invalid_response))
            }
        }
    }

    /** Config'ten API taban URL al. forceRefresh=true ise önbelleği kullanmaz, her seferinde sunucudan çeker. */
    private fun getApiBaseUrl(forceRefresh: Boolean = false): String {
        if (!forceRefresh) {
            val cached = prefs.getString(KEY_API_BASE, null)?.trim()
            if (!cached.isNullOrEmpty()) return cached.trimEnd('/')
        }
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
                prefs.edit().putString(KEY_API_BASE, fallback).apply()
                fallback
            }
        } catch (e: Exception) {
            val fallback = "$BOOTSTRAP_BASE/api/proxy"
            Log.e(TAG, "config fetch error, using $fallback", e)
            prefs.edit().putString(KEY_API_BASE, fallback).apply()
            fallback
        }
    }

    /** Returns Pair(streamUrl, errorMessage). streamUrl non-null = success; else errorMessage for user. */
    private fun resolveStreamUrl(code: String): Pair<String?, String?> {
        return try {
            val apiBase = getApiBaseUrl(forceRefresh = true)
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
            val json = response.body?.string() ?: ""
            Log.d(TAG, "resolve response: ${response.code} url=$resolveUrl body=${json.take(300)}")
            val isJson = json.trimStart().startsWith("{")
            val obj = if (json.isNotEmpty() && isJson) try { JSONObject(json) } catch (_: Exception) { JSONObject() } else JSONObject()
            if (!response.isSuccessful) {
                val msg = obj.optString("message", "").ifEmpty { null }
                Log.e(TAG, "resolve failed: ${response.code} $resolveUrl $msg")
                prefs.edit().remove(KEY_API_BASE).apply()
                return Pair(null, msg ?: getString(R.string.error_server_config))
            }
            if (obj.has("streamUrl")) {
                val url = obj.getString("streamUrl").takeIf { it.isNotEmpty() }
                if (url != null) return Pair(url, null)
            }
            if (!isJson || json.isBlank()) {
                Log.e(TAG, "resolve: body is not JSON (maybe HTML). url=$resolveUrl")
                prefs.edit().remove(KEY_API_BASE).apply()
                return Pair(null, getString(R.string.error_not_json))
            }
            val err = obj.optString("error", "").trim()
            val msg = obj.optString("message", "").ifEmpty {
                when (err.uppercase()) {
                    "CODE_NOT_FOUND" -> getString(R.string.error_code_not_found)
                    "CODE_INACTIVE" -> getString(R.string.error_code_inactive)
                    "CONFIG_ERROR" -> getString(R.string.error_server_config)
                    else -> getString(R.string.error_invalid_response)
                }
            }
            if (err.equals("CONFIG_ERROR", ignoreCase = true)) prefs.edit().remove(KEY_API_BASE).apply()
            Pair(null, msg)
        } catch (e: Exception) {
            Log.e(TAG, "resolve error", e)
            prefs.edit().remove(KEY_API_BASE).apply()
            Pair(null, getString(R.string.error_network))
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

    private fun startPlaybackKeepAliveService() {
        try {
            ContextCompat.startForegroundService(this, Intent(this, PlaybackKeepAliveService::class.java))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start keep-alive service", e)
        }
    }

    private fun stopPlaybackKeepAliveService() {
        try {
            stopService(Intent(this, PlaybackKeepAliveService::class.java))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop keep-alive service", e)
        }
    }

    @UnstableApi
    private fun startPlayback(streamUrl: String) {
        releasePlayer()
        startPlaybackKeepAliveService()
        lastPlayingTimeMs = System.currentTimeMillis()
        if (streamUrl.contains("/display/")) {
            playerView.visibility = View.GONE
            displayContainer.visibility = View.VISIBLE
            webviewLoading.visibility = View.VISIBLE
            applyFullscreenWhenPlaying(true)
            lastWebViewReloadMs = System.currentTimeMillis()
            displayWebView?.loadUrl(streamUrl)
            Log.d(TAG, "loading display URL in WebView (lite/low for weak devices): $streamUrl")
        } else {
            displayContainer.visibility = View.GONE
            val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                .setConnectTimeoutMs(15_000)
                .setReadTimeoutMs(20_000)
            // Stick hedef: düşük buffer (bellek/GPU yükü az)
            val (minBufMs, maxBufMs) = 15_000 to 60_000
            val loadControl = DefaultLoadControl.Builder()
                .setBufferDurationsMs(minBufMs, maxBufMs, 5_000, 5_000)
                .build()
            val mediaSourceFactory = DefaultMediaSourceFactory(this).setDataSourceFactory(httpDataSourceFactory)
            exoPlayer = ExoPlayer.Builder(this)
                .setMediaSourceFactory(mediaSourceFactory)
                .setLoadControl(loadControl)
                .build()
                .also { player ->
                    displayContainer.visibility = View.GONE
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
        displayWebView?.stopLoading()
        displayWebView?.loadUrl("about:blank")
        webviewLoading.visibility = View.GONE
        displayContainer.visibility = View.GONE
    }

    /** Yayından çık: kodu silmeden uygulamayı kapat. Kullanıcı çıkış yaptığı için otomatik yeniden açılma devre dışı. */
    private fun exitBroadcast() {
        prefs.edit().putBoolean(RestartReceiver.KEY_USER_EXIT, true).apply()
        cancelRestartAlarm()
        stopWatchdog()
        stopPlaybackKeepAliveService()
        currentStreamUrl = null
        releasePlayer()
        applyFullscreenWhenPlaying(false)
        finish()
    }

    private fun scheduleRestartAlarm() {
        val am = getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(this, RestartReceiver::class.java).setAction(RestartReceiver.ACTION_RESTART_CHECK)
        val pending = PendingIntent.getBroadcast(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val interval = RESTART_ALARM_INTERVAL_MS
        try {
            am.setInexactRepeating(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + interval,
                interval,
                pending
            )
            Log.d(TAG, "Restart alarm scheduled (every ${interval / 60_000} min)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule restart alarm", e)
        }
    }

    private fun cancelRestartAlarm() {
        val am = getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(this, RestartReceiver::class.java).setAction(RestartReceiver.ACTION_RESTART_CHECK)
        val pending = PendingIntent.getBroadcast(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        am.cancel(pending)
        Log.d(TAG, "Restart alarm cancelled")
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        when (level) {
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_MODERATE,
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW,
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL -> {
                displayWebView?.let { w ->
                    if (currentStreamUrl?.contains("/display/") == true) {
                        Log.d(TAG, "Trim memory level=$level: clearing WebView cache and reloading")
                        w.clearCache(true)
                        mainHandler.postDelayed({ w.reload() }, if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL) 0L else 500L)
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        stopWatchdog()
        resolveJob?.cancel()
        releasePlayer()
        try {
            displayWebView?.destroy()
            displayWebView = null
        } catch (e: Exception) {
            Log.e(TAG, "WebView destroy on activity destroy", e)
        }
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (displayContainer.visibility == View.VISIBLE || playerView.visibility == View.VISIBLE) {
            exitBroadcast()
        } else {
            super.onBackPressed()
        }
    }
}
