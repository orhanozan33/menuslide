package com.digitalsignage.tv

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.digitalsignage.tv.data.repository.DeviceRepository
import com.digitalsignage.tv.layout.LayoutRenderer
import com.digitalsignage.tv.player.PlayerManager
import com.digitalsignage.tv.service.HeartbeatService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.media3.ui.PlayerView
import com.digitalsignage.tv.BuildConfig
import com.digitalsignage.tv.R
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject lateinit var repository: DeviceRepository
    @Inject lateinit var layoutRenderer: LayoutRenderer
    @Inject lateinit var playerManager: PlayerManager

    private var renderJob: Job? = null
    private var webViewRefreshJob: Job? = null
    private var displayUrlForRefresh: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (repository.getDeviceToken() == null) {
            startActivity(Intent(this, com.digitalsignage.tv.activation.ActivationActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
            finish()
            return
        }
        setContentView(R.layout.activity_main_enterprise)
        checkForUpdate()
        keepScreenOn()
        applyFullscreen()
        startForegroundHeartbeat()

        var displayUrl = repository.getDisplayUrl()
        if (!displayUrl.isNullOrBlank()) {
            if (!displayUrl.contains("lite=1") && !displayUrl.contains("ultralow=1")) {
                displayUrl = if (displayUrl.contains("?")) "$displayUrl&lite=1" else "$displayUrl?lite=1"
                repository.saveDisplayUrl(displayUrl)
            }
            displayUrlForRefresh = displayUrl
            loadDisplayInWebView(displayUrl)
            startWebViewPeriodicRefresh()
        } else {
            renderJob = lifecycleScope.launch { loadAndRenderLayout() }
        }
    }

    private companion object {
        const val WEBVIEW_REFRESH_INTERVAL_MS = 10 * 60 * 1000L
    }

    private fun startWebViewPeriodicRefresh() {
        webViewRefreshJob?.cancel()
        webViewRefreshJob = lifecycleScope.launch {
            while (true) {
                delay(WEBVIEW_REFRESH_INTERVAL_MS)
                val url = displayUrlForRefresh ?: return@launch
                runOnUiThread { reloadWebViewToFreeMemory(url) }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun loadDisplayInWebView(url: String) {
        val webView = findViewById<WebView>(R.id.display_webview)
        val rootContainer = findViewById<FrameLayout>(R.id.root_container)
        webView.visibility = View.VISIBLE
        rootContainer.visibility = View.GONE
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_NO_CACHE
            mediaPlaybackRequiresUserGesture = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
        }
        webView.webViewClient = WebViewClient()
        webView.loadUrl(url)
    }

    private fun reloadWebViewToFreeMemory(url: String) {
        val webView = findViewById<WebView>(R.id.display_webview)
        if (webView.visibility != View.VISIBLE) return
        webView.clearCache(true)
        webView.loadUrl("about:blank")
        webView.loadUrl(url)
    }

    private fun keepScreenOn() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun applyFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.hide(android.view.WindowInsets.Type.statusBars() or android.view.WindowInsets.Type.navigationBars())
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }
    }

    private fun startForegroundHeartbeat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(Intent(this, HeartbeatService::class.java))
        } else {
            startService(Intent(this, HeartbeatService::class.java))
        }
    }

    private suspend fun loadAndRenderLayout() {
        while (true) {
            val json = withContext(Dispatchers.IO) { repository.getCachedLayoutJson() }
            if (!json.isNullOrEmpty()) {
                val payload = layoutRenderer.parseLayout(json)
                val root = findViewById<FrameLayout>(R.id.root_container)
                withContext(Dispatchers.Main) {
                    layoutRenderer.render(payload, root)
                    attachVideoToFirstVideoView(root)
                }
            }
            delay(15_000)
        }
    }

    private fun attachVideoToFirstVideoView(root: FrameLayout) {
        val videoUrl = findFirstVideoUrlTag(root) ?: return
        val container = playerManager.findVideoContainer(root, videoUrl) ?: return
        if (container.childCount == 0) {
            val playerView = PlayerView(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            container.addView(playerView)
            playerManager.attachPlayerView(playerView)
            playerManager.setVideoUrl(videoUrl, container)
        }
    }

    private fun findFirstVideoUrlTag(group: ViewGroup): String? {
        for (i in 0 until group.childCount) {
            val v = group.getChildAt(i)
            val tag = v.tag?.toString()
            if (!tag.isNullOrEmpty() && (tag.startsWith("http://") || tag.startsWith("https://"))) return tag
            if (v is ViewGroup) findFirstVideoUrlTag(v)?.let { return it }
        }
        return null
    }

    override fun onDestroy() {
        renderJob?.cancel()
        webViewRefreshJob?.cancel()
        try {
            val webView = findViewById<WebView>(R.id.display_webview)
            webView.loadUrl("about:blank")
            webView.destroy()
        } catch (_: Exception) { }
        playerManager.release()
        super.onDestroy()
    }

    private fun checkForUpdate() {
        lifecycleScope.launch {
            val config = withContext(Dispatchers.IO) { repository.getTvAppConfig() } ?: return@launch
            val currentCode = BuildConfig.VERSION_CODE
            val minRequired = config.minVersionCode
            val latestAvailable = config.latestVersionCode

            val isRequired = minRequired != null && currentCode < minRequired
            val isOptional = latestAvailable != null && currentCode < latestAvailable && !isRequired

            if (isRequired || isOptional) {
                val downloadUrl = buildDownloadUrl(config.apiBaseUrl, config.downloadUrl)
                withContext(Dispatchers.Main) {
                    showUpdateDialog(required = isRequired, downloadUrl = downloadUrl)
                }
            }
        }
    }

    private fun buildDownloadUrl(apiBaseUrl: String?, downloadUrl: String?): String {
        val url = downloadUrl?.trim() ?: return ""
        if (url.startsWith("http://") || url.startsWith("https://")) return url
        val base = (apiBaseUrl ?: "https://menuslide.com").trimEnd('/')
        return if (url.startsWith("/")) base + url else "$base/$url"
    }

    private fun showUpdateDialog(required: Boolean, downloadUrl: String) {
        val title = if (required) getString(R.string.update_required_title) else getString(R.string.update_available_title)
        val message = if (required) getString(R.string.update_required_message) else getString(R.string.update_available_message)
        val builder = AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton(getString(R.string.btn_update)) { _, _ ->
                openDownloadUrl(downloadUrl)
                if (required) finish()
            }
        if (!required) {
            builder.setNegativeButton(getString(R.string.btn_skip), null)
        } else {
            builder.setCancelable(false)
        }
        builder.show()
    }

    private fun openDownloadUrl(url: String) {
        if (url.isEmpty()) return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) { }
    }
}
