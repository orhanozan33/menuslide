package com.digitalsignage.tv.signage.renderer

import android.graphics.Color
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.media3.ui.PlayerView
import com.digitalsignage.tv.signage.data.DisplayConfig
import com.digitalsignage.tv.signage.data.Section
import com.digitalsignage.tv.signage.player.PlayerManager

/**
 * Renders DisplayConfig natively: background + dynamic views (video via ExoPlayer, text, price).
 */
class LayoutRenderer(
    private val container: FrameLayout,
    private val playerManager: PlayerManager,
    private val screenWidth: Int = 1920,
    private val screenHeight: Int = 1080
) {
    private val scaleX: Float get() = if (container.width == 0) 1f else container.width.toFloat() / screenWidth
    private val scaleY: Float get() = if (container.height == 0) 1f else container.height.toFloat() / screenHeight

    fun render(config: DisplayConfig) {
        playerManager.releaseAll()
        container.removeAllViews()
        try {
            container.setBackgroundColor(parseColor(config.background))
        } catch (_: Exception) {
            container.setBackgroundColor(Color.BLACK)
        }

        config.sections.forEachIndexed { index, section ->
            when (section.type.lowercase()) {
                "video" -> renderVideo("v_$index", section)
                "text", "price" -> renderText(section)
            }
        }
    }

    private fun renderVideo(sectionId: String, section: Section) {
        val url = section.url ?: return
        val w = (section.width * scaleX).toInt().coerceAtLeast(1)
        val h = (section.height * scaleY).toInt().coerceAtLeast(1)
        val playerView = playerManager.getOrCreatePlayerView(sectionId, url, w, h)
        val params = FrameLayout.LayoutParams(w, h).apply {
            leftMargin = (section.x * scaleX).toInt()
            topMargin = (section.y * scaleY).toInt()
        }
        container.addView(playerView, params)
    }

    private fun renderText(section: Section) {
        val value = section.value ?: return
        val displayText = if (section.type.lowercase() == "price" && !section.currency.isNullOrBlank()) {
            section.currency + value
        } else {
            value
        }
        val textView = TextView(container.context).apply {
            text = displayText
            setTextColor(parseColor(section.color))
            setTextSize(TypedValue.COMPLEX_UNIT_PX, section.fontSize * scaleY)
            gravity = Gravity.START or Gravity.CENTER_VERTICAL
        }
        val params = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            leftMargin = (section.x * scaleX).toInt()
            topMargin = (section.y * scaleY).toInt()
        }
        container.addView(textView, params)
    }

    fun releaseVideoPlayers() {
        container.removeAllViews()
        playerManager.releaseAll()
    }

    private fun parseColor(hex: String): Int {
        var s = hex.trim()
        if (!s.startsWith("#")) s = "#$s"
        return Color.parseColor(s)
    }
}
