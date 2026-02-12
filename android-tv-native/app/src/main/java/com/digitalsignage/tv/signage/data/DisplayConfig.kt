package com.digitalsignage.tv.signage.data

import com.google.gson.annotations.SerializedName

/** Root layout from GET /api/display/{code} */
data class DisplayConfig(
    @SerializedName("background") val background: String = "#000000",
    @SerializedName("sections") val sections: List<Section> = emptyList(),
    @SerializedName("refreshInterval") val refreshInterval: Int = 60
)

/** One section: video, text, or price. All fields optional for flexibility. */
data class Section(
    @SerializedName("type") val type: String = "text",
    @SerializedName("url") val url: String? = null,
    @SerializedName("value") val value: String? = null,
    @SerializedName("currency") val currency: String? = null,
    @SerializedName("fontSize") val fontSize: Int = 32,
    @SerializedName("color") val color: String = "#ffffff",
    @SerializedName("x") val x: Int = 0,
    @SerializedName("y") val y: Int = 0,
    @SerializedName("width") val width: Int = 1920,
    @SerializedName("height") val height: Int = 1080
)
