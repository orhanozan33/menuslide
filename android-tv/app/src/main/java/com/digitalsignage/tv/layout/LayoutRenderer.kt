package com.digitalsignage.tv.layout

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.view.setPadding
import com.digitalsignage.tv.data.api.LayoutComponent
import com.digitalsignage.tv.data.api.LayoutPayload
import com.google.gson.Gson

/**
 * Native layout renderer. No WebView. Renders JSON layout with ConstraintLayout/FrameLayout.
 */
class LayoutRenderer(private val context: Context, private val gson: Gson) {

    fun parseLayout(json: String): LayoutPayload? = try {
        gson.fromJson(json, LayoutPayload::class.java)
    } catch (_: Exception) { null }

    fun render(layoutPayload: LayoutPayload?, container: ViewGroup) {
        container.removeAllViews()
        layoutPayload ?: return
        val bgColor = parseColor(layoutPayload.backgroundColor, Color.BLACK)
        container.setBackgroundColor(bgColor)
        val components = layoutPayload.components ?: return
        val sorted = components.sortedBy { it.zIndex }
        for (comp in sorted) {
            val view = createViewFor(comp) ?: continue
            val params = FrameLayout.LayoutParams(
                dpToPx(comp.width).coerceAtLeast(1),
                dpToPx(comp.height).coerceAtLeast(1)
            ).apply {
                leftMargin = dpToPx(comp.x)
                topMargin = dpToPx(comp.y)
            }
            container.addView(view, params)
        }
    }

    private fun createViewFor(comp: LayoutComponent): android.view.View? = when (comp.type.lowercase()) {
        "text" -> TextView(context).apply {
            text = comp.text ?: ""
            setTextColor(parseColor(comp.textColor, Color.WHITE))
            textSize = comp.textSize
            setPadding(dpToPx(4))
            gravity = Gravity.CENTER
        }
        "image" -> ImageView(context).apply {
            scaleType = ImageView.ScaleType.FIT_XY
            setBackgroundColor(parseColor(comp.backgroundColor, Color.TRANSPARENT))
        }
        "video" -> FrameLayout(context).apply {
            setBackgroundColor(parseColor(comp.backgroundColor, Color.BLACK))
            tag = comp.videoUrl
        }
        "price" -> TextView(context).apply {
            text = comp.text ?: ""
            setTextColor(parseColor(comp.textColor, Color.WHITE))
            textSize = (comp.textSize * 1.2f).coerceAtLeast(14f)
            setPadding(dpToPx(4))
            gravity = Gravity.CENTER
        }
        else -> null
    }

    private fun parseColor(hex: String?, default: Int): Int = try {
        if (hex.isNullOrBlank()) default
        else Color.parseColor(if (hex.startsWith("#")) hex else "#$hex")
    } catch (_: Exception) { default }

    private fun dpToPx(dp: Int): Int =
        (dp * context.resources.displayMetrics.density).toInt()
}
