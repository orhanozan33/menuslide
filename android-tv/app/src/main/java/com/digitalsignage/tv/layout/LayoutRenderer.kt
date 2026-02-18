package com.digitalsignage.tv.layout

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.core.view.setPadding
import com.digitalsignage.tv.R
import com.digitalsignage.tv.data.api.LayoutComponent
import com.digitalsignage.tv.data.api.LayoutPayload
import com.digitalsignage.tv.data.api.LayoutSlide
import com.google.gson.Gson

/**
 * Native layout renderer. Backend bazen components, bazen slides döner. İkisini de destekler.
 */
class LayoutRenderer(private val context: Context, private val gson: Gson) {

    fun parseLayout(json: String): LayoutPayload? = try {
        gson.fromJson(json, LayoutPayload::class.java)
    } catch (_: Exception) { null }

    fun render(layoutPayload: LayoutPayload?, container: ViewGroup) {
        container.removeAllViews()
        val bgColor = parseColor(layoutPayload?.backgroundColor, Color.BLACK)
        container.setBackgroundColor(bgColor)
        when {
            layoutPayload == null -> showNoBroadcast(container)
            !layoutPayload.components.isNullOrEmpty() -> renderComponents(layoutPayload.components!!, container)
            !layoutPayload.slides.isNullOrEmpty() -> renderFirstSlide(layoutPayload.slides!!, container)
            else -> showNoBroadcast(container)
        }
    }

    private fun showNoBroadcast(container: ViewGroup) {
        val msg = TextView(context).apply {
            text = context.getString(R.string.no_broadcast)
            setTextColor(Color.WHITE)
            textSize = 18f
            setPadding(dpToPx(24))
            gravity = Gravity.CENTER
        }
        container.addView(msg, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ).apply { topMargin = dpToPx(48) })
    }

    private fun renderComponents(components: List<LayoutComponent>, container: ViewGroup) {
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

    /** Backend slides formatı: ilk slaytı göster (rotasyon MainActivity'de). */
    private fun renderFirstSlide(slides: List<LayoutSlide>, container: ViewGroup) {
        val first = slides.firstOrNull() ?: return showNoBroadcast(container)
        renderSingleSlide(first, container)
    }

    /** Tek bir slaytı container'a çiz (görsel veya metin). Rotasyon için kullanılır. */
    fun renderSingleSlide(slide: LayoutSlide, container: ViewGroup) {
        container.removeAllViews()
        container.addView(createSlideView(slide), FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
    }

    /** Web ile aynı: geçişte yeni slayt view'ı oluşturur (container'a eklemeden). */
    fun createSlideView(slide: LayoutSlide): android.view.View {
        return when (slide.type?.lowercase()) {
            "image" -> ImageView(context).apply {
                scaleType = ImageView.ScaleType.CENTER_INSIDE
                setBackgroundColor(Color.BLACK)
                tag = slide.url
            }
            "text" -> {
                val content = listOfNotNull(slide.title, slide.description).filter { it.isNotBlank() }.joinToString("\n\n")
                TextView(context).apply {
                    text = if (content.isNotEmpty()) content else context.getString(R.string.slide_loading)
                    setTextColor(Color.WHITE)
                    textSize = 24f
                    setPadding(dpToPx(48))
                    gravity = Gravity.CENTER
                }
            }
            else -> TextView(context).apply {
                text = context.getString(R.string.slide_loading)
                setTextColor(Color.WHITE)
                textSize = 24f
                setPadding(dpToPx(48))
                gravity = Gravity.CENTER
            }
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
