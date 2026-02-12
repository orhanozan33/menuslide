package com.digitalsignage.tv.signage

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.digitalsignage.tv.signage.api.ApiModule
import com.digitalsignage.tv.signage.data.DisplayConfig
import com.digitalsignage.tv.signage.player.PlayerManager
import com.digitalsignage.tv.signage.renderer.LayoutRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Native Digital Signage Player (no WebView).
 * Enter display code -> GET /api/display/{code} -> render layout natively.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var screenCodeInput: LinearLayout
    private lateinit var inputCode: EditText
    private lateinit var btnStart: Button
    private lateinit var labelError: TextView
    private lateinit var displayContainer: FrameLayout

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val handler = Handler(Looper.getMainLooper())
    private val api = ApiModule.createApi()
    private lateinit var playerManager: PlayerManager
    private lateinit var layoutRenderer: LayoutRenderer

    private var lastValidConfig: DisplayConfig? = null
    private var refreshRunnable: Runnable? = null
    private var currentCode: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_main)

        screenCodeInput = findViewById(R.id.screen_code_input)
        inputCode = findViewById(R.id.input_code)
        btnStart = findViewById(R.id.btn_start)
        labelError = findViewById(R.id.label_error)
        displayContainer = findViewById(R.id.display_container)

        playerManager = PlayerManager(this)
        layoutRenderer = LayoutRenderer(displayContainer, playerManager)

        btnStart.setOnClickListener { onStartClicked() }

        applyFullscreen(false)
    }

    private fun onStartClicked() {
        val code = inputCode.text?.toString()?.trim() ?: ""
        if (code.isEmpty()) {
            showError(getString(R.string.hint_display_code))
            return
        }
        showError(null)
        currentCode = code
        loadAndRender(code)
    }

    private fun loadAndRender(code: String) {
        scope.launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    api.getDisplayConfig(code)
                }
                if (response.isSuccessful) {
                    val config = response.body()
                    if (config != null) {
                        lastValidConfig = config
                        showPlayback(config)
                        scheduleRefresh(code, config.refreshInterval)
                    } else {
                        showError(getString(R.string.error_invalid_code))
                    }
                } else {
                    showError(getString(R.string.error_invalid_code))
                }
            } catch (e: Exception) {
                showError(getString(R.string.error_network))
                handler.postDelayed({ loadAndRender(code) }, 10_000L)
            }
        }
    }

    private fun showPlayback(config: DisplayConfig) {
        screenCodeInput.visibility = View.GONE
        displayContainer.visibility = View.VISIBLE
        applyFullscreen(true)
        layoutRenderer.render(config)
    }

    private fun scheduleRefresh(code: String, intervalSeconds: Int) {
        refreshRunnable?.let { handler.removeCallbacks(it) }
        val intervalMs = (intervalSeconds * 1000L).coerceAtLeast(10_000L)
        val holder = arrayOf<Runnable?>(null)
        val r = Runnable {
            scope.launch {
                try {
                    val response = withContext(Dispatchers.IO) {
                        api.getDisplayConfig(code)
                    }
                    if (response.isSuccessful && response.body() != null) {
                        lastValidConfig = response.body()
                        layoutRenderer.render(response.body()!!)
                    }
                    holder[0]?.let { handler.postDelayed(it, intervalMs) }
                } catch (_: Exception) {
                    holder[0]?.let { handler.postDelayed(it, 10_000L) }
                }
            }
        }
        holder[0] = r
        refreshRunnable = r
        handler.postDelayed(r, intervalMs)
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun applyFullscreen(fullscreen: Boolean) {
        WindowCompat.setDecorFitsSystemWindows(window, !fullscreen)
        if (fullscreen) {
            WindowInsetsControllerCompat(window, window.decorView).apply {
                hide(androidx.core.view.WindowInsetsCompat.Type.systemBars())
                systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        }
    }

    private fun showError(message: String?) {
        if (!message.isNullOrEmpty()) {
            labelError.text = message
            labelError.visibility = View.VISIBLE
        } else {
            labelError.visibility = View.GONE
        }
    }

    override fun onBackPressed() {
        if (displayContainer.visibility == View.VISIBLE) {
            refreshRunnable?.let { handler.removeCallbacks(it) }
            layoutRenderer.releaseVideoPlayers()
            displayContainer.visibility = View.GONE
            screenCodeInput.visibility = View.VISIBLE
            applyFullscreen(false)
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        refreshRunnable?.let { handler.removeCallbacks(it) }
        layoutRenderer.releaseVideoPlayers()
        super.onDestroy()
    }
}
