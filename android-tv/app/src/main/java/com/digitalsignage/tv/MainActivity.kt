package com.digitalsignage.tv

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.digitalsignage.tv.data.api.LayoutSlide
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
    private var slideRotationJob: Job? = null
    /** Son uygulanan layout JSON; sadece değiştiğinde ekranı yenileyerek güncelleme yayına hemen yansır. */
    private var lastAppliedLayoutJson: String? = null

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
        keepScreenOn()
        applyFullscreen()
        startForegroundHeartbeat()

        lifecycleScope.launch {
            delay(800)
            checkForUpdate()
        }
        lifecycleScope.launch { loadNativeLayoutOrVideo() }
    }

    private suspend fun loadNativeLayoutOrVideo() {
        withContext(Dispatchers.IO) { repository.fetchAndUpdateLayout() }
        val layoutJson = withContext(Dispatchers.IO) { repository.getCachedLayoutJson() }
        val payload = layoutJson?.let { layoutRenderer.parseLayout(it) }
        val root = findViewById<FrameLayout>(R.id.root_container)
        val playerView = findViewById<PlayerView>(R.id.player_view)

        val videoUrl = extractVideoUrl(payload)
        if (!videoUrl.isNullOrBlank() && (videoUrl.endsWith(".m3u8") || videoUrl.endsWith(".mp4"))) {
            withContext(Dispatchers.Main) {
                root.visibility = android.view.View.GONE
                playerView.visibility = android.view.View.VISIBLE
                playerManager.attachPlayerView(playerView)
                playerManager.setVideoUrl(videoUrl, null)
            }
        } else {
            val slides = payload?.slides
            val firstBitmap = if (!slides.isNullOrEmpty() && slides[0].type?.lowercase() == "image" && !slides[0].url.isNullOrBlank())
                withContext(Dispatchers.IO) { loadBitmapFromUrl(slides[0].url!!) } else null
            withContext(Dispatchers.Main) {
                playerView.visibility = android.view.View.GONE
                root.visibility = android.view.View.VISIBLE
                layoutRenderer.render(payload, root)
                if (firstBitmap != null && !slides.isNullOrEmpty()) findImageViewWithTag(root, slides[0].url ?: "")?.setImageBitmap(firstBitmap)
                else loadSlideImageIfNeeded(root)
                attachVideoToFirstVideoView(root)
                startSlideRotation(slides, root)
                lastAppliedLayoutJson = layoutJson
            }
            // Periyodik kontrol: layout değiştiyse ekranı güncelle (yayın güncellemesi ~60 sn içinde yansır)
            renderJob = lifecycleScope.launch {
                while (true) {
                    delay(60_000)
                    val updated = withContext(Dispatchers.IO) { repository.fetchAndUpdateLayout() }
                    if (!updated) return@launch
                    val newJson = withContext(Dispatchers.IO) { repository.getCachedLayoutJson() } ?: return@launch
                    if (newJson == lastAppliedLayoutJson) return@launch
                    val newPayload = layoutRenderer.parseLayout(newJson) ?: return@launch
                    val newSlides = newPayload.slides
                    val firstBitmap = if (!newSlides.isNullOrEmpty() && newSlides[0].type?.lowercase() == "image" && !newSlides[0].url.isNullOrBlank())
                        withContext(Dispatchers.IO) { loadBitmapFromUrl(newSlides[0].url!!) } else null
                    withContext(Dispatchers.Main) {
                        if (!root.isAttachedToWindow) return@withContext
                        layoutRenderer.render(newPayload, root)
                        if (firstBitmap != null && !newSlides.isNullOrEmpty()) findImageViewWithTag(root, newSlides[0].url ?: "")?.setImageBitmap(firstBitmap)
                        else loadSlideImageIfNeeded(root)
                        attachVideoToFirstVideoView(root)
                        startSlideRotation(newSlides, root)
                        lastAppliedLayoutJson = newJson
                    }
                }
            }
        }
    }

    /** Web ile birebir: kullanıcının ayarladığı display_duration (sn) kadar göster, sonra transition_duration (ms) ile geçiş. */
    private fun startSlideRotation(slides: List<LayoutSlide>?, root: ViewGroup) {
        slideRotationJob?.cancel()
        if (slides.isNullOrEmpty() || slides.size <= 1) return
        var index = 0
        slideRotationJob = lifecycleScope.launch {
            while (true) {
                // Web DisplayPageView: durationSec = Math.max(1, currentRotation.display_duration || 5)
                val displaySeconds = slides[index].duration.coerceIn(1, 86400)
                delay(displaySeconds * 1000L)
                val nextIndex = (index + 1) % slides.size
                val nextSlide = slides[nextIndex]
                val preloadedBitmap = if (nextSlide.type?.lowercase() == "image" && !nextSlide.url.isNullOrBlank())
                    withContext(Dispatchers.IO) { loadBitmapFromUrl(nextSlide.url) } else null
                withContext(Dispatchers.Main) {
                    if (!root.isAttachedToWindow) return@withContext
                    runWebStyleTransition(root, root.getChildAt(0), nextSlide, preloadedBitmap)
                    if (preloadedBitmap == null) loadSlideImageIfNeeded(root)
                }
                index = nextIndex
            }
        }
    }

    private fun loadBitmapFromUrl(url: String): android.graphics.Bitmap? = try {
        val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
        conn.doInput = true
        conn.connectTimeout = 10_000
        conn.readTimeout = 15_000
        conn.inputStream.use { android.graphics.BitmapFactory.decodeStream(it) }
    } catch (_: Exception) { null }

    /** Web DisplayPageView ile aynı mantık: current çıkış + next giriş aynı anda. Önceden yüklenen bitmap varsa siyah ekran olmaz. */
    private fun runWebStyleTransition(container: ViewGroup, currentView: View?, nextSlide: LayoutSlide, preloadedBitmap: android.graphics.Bitmap? = null) {
        if (currentView == null) {
            layoutRenderer.renderSingleSlide(nextSlide, container)
            if (preloadedBitmap != null) findImageViewWithTag(container, nextSlide.url ?: "")?.setImageBitmap(preloadedBitmap)
            else loadSlideImageIfNeeded(container)
            return
        }
        // Web: nextRot?.transition_duration ?? 1400 (backend artık aynı varsayılanı gönderiyor)
        val durationMs = (nextSlide.transition_duration ?: 1400).coerceIn(100, 5000).toLong()
        val w = if (container.width > 0) container.width.toFloat() else resources.displayMetrics.widthPixels.toFloat().coerceAtLeast(1f)
        val nextView = layoutRenderer.createSlideView(nextSlide)
        if (nextView is android.widget.ImageView && preloadedBitmap != null) nextView.setImageBitmap(preloadedBitmap)
        val lp = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        container.addView(nextView, lp)
        when (nextSlide.transition_effect?.lowercase()) {
            "fade" -> {
                nextView.alpha = 0f
                nextView.animate().alpha(1f).setDuration(durationMs).withEndAction {
                    container.removeView(currentView)
                    nextView.alpha = 1f
                }.start()
                currentView.animate().alpha(0f).setDuration(durationMs).start()
            }
            "slide-left" -> {
                nextView.translationX = w
                nextView.animate().translationX(0f).setDuration(durationMs).setInterpolator(android.view.animation.DecelerateInterpolator()).withEndAction {
                    container.removeView(currentView)
                    nextView.translationX = 0f
                }.start()
                currentView.animate().translationX(-w).setDuration(durationMs).setInterpolator(android.view.animation.DecelerateInterpolator()).start()
            }
            "slide-right" -> {
                nextView.translationX = -w
                nextView.animate().translationX(0f).setDuration(durationMs).setInterpolator(android.view.animation.DecelerateInterpolator()).withEndAction {
                    container.removeView(currentView)
                    nextView.translationX = 0f
                }.start()
                currentView.animate().translationX(w).setDuration(durationMs).setInterpolator(android.view.animation.DecelerateInterpolator()).start()
            }
            "zoom" -> {
                nextView.alpha = 0f
                nextView.scaleX = 1.15f
                nextView.scaleY = 1.15f
                nextView.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(durationMs).withEndAction {
                    container.removeView(currentView)
                    nextView.alpha = 1f
                    nextView.scaleX = 1f
                    nextView.scaleY = 1f
                }.start()
                currentView.animate().alpha(0f).scaleX(0.85f).scaleY(0.85f).setDuration(durationMs).start()
            }
            else -> {
                nextView.alpha = 0f
                nextView.animate().alpha(1f).setDuration(durationMs).withEndAction {
                    container.removeView(currentView)
                    nextView.alpha = 1f
                }.start()
                currentView.animate().alpha(0f).setDuration(durationMs).start()
            }
        }
    }

    /** Slides formatında ilk slayt görselse, ImageView tag'deki URL'den yükle. */
    private fun loadSlideImageIfNeeded(root: ViewGroup) {
        val url = findSlideImageUrl(root) ?: return
        lifecycleScope.launch {
            val bitmap = withContext(Dispatchers.IO) {
                try {
                    val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                    conn.doInput = true
                    conn.connectTimeout = 10_000
                    conn.readTimeout = 15_000
                    conn.inputStream.use { android.graphics.BitmapFactory.decodeStream(it) }
                } catch (_: Exception) { null }
            }
            bitmap?.let { withContext(Dispatchers.Main) { findImageViewWithTag(root, url)?.setImageBitmap(it) } }
        }
    }

    private fun findSlideImageUrl(group: ViewGroup): String? {
        for (i in 0 until group.childCount) {
            val v = group.getChildAt(i)
            if (v is android.widget.ImageView) {
                val tag = v.tag
                if (tag is String && (tag.startsWith("http://") || tag.startsWith("https://"))) return tag
            }
            if (v is ViewGroup) findSlideImageUrl(v)?.let { return it }
        }
        return null
    }

    private fun findImageViewWithTag(group: ViewGroup, url: String): android.widget.ImageView? {
        for (i in 0 until group.childCount) {
            val v = group.getChildAt(i)
            if (v is android.widget.ImageView && url == v.tag) return v
            if (v is ViewGroup) findImageViewWithTag(v, url)?.let { return it }
        }
        return null
    }

    private fun extractVideoUrl(payload: com.digitalsignage.tv.data.api.LayoutPayload?): String? {
        payload ?: return null
        if (payload.type == "video" && !payload.videoUrl.isNullOrBlank()) {
            return payload.videoUrl.takeIf { it.startsWith("http") }
        }
        return payload.components?.firstOrNull { it.type == "video" }?.videoUrl?.takeIf { it?.startsWith("http") == true }
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
        slideRotationJob?.cancel()
        playerManager.release()
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        lifecycleScope.launch {
            delay(500)
            checkForUpdate()
        }
    }

    private fun checkForUpdate() {
        lifecycleScope.launch {
            var config = withContext(Dispatchers.IO) { repository.getTvAppConfig() }
            if (config == null) {
                delay(2000)
                config = withContext(Dispatchers.IO) { repository.getTvAppConfig() }
            }
            val cfg = config ?: return@launch
            val currentCode = BuildConfig.VERSION_CODE
            val minRequired = cfg.minVersionCode
            val latestAvailable = cfg.latestVersionCode ?: cfg.minVersionCode

            val hasUpdate = (minRequired != null && currentCode < minRequired) ||
                (latestAvailable != null && currentCode < latestAvailable)

            if (hasUpdate) {
                val downloadUrl = buildDownloadUrl(cfg.apiBaseUrl, cfg.downloadUrl)
                if (downloadUrl.isNotBlank() && !isFinishing) {
                    withContext(Dispatchers.Main) {
                        if (!isFinishing) showUpdateDialog(downloadUrl = downloadUrl)
                    }
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

    private fun showUpdateDialog(downloadUrl: String) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.update_available_title))
            .setMessage(getString(R.string.update_available_message))
            .setPositiveButton(getString(R.string.btn_update)) { _, _ -> openDownloadUrl(downloadUrl) }
            .setNegativeButton(getString(R.string.btn_skip), null)
            .setCancelable(true)
            .show()
    }

    private fun openDownloadUrl(url: String) {
        if (url.isEmpty()) return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) { }
    }
}
