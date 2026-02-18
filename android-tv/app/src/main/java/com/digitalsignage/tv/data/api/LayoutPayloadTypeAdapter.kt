package com.digitalsignage.tv.data.api

import com.google.gson.Gson
import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter
import java.util.ArrayList

/**
 * LayoutPayload için özel TypeAdapter.
 * ParameterizedType/TypeToken kullanmaz; manuel array parse (ProGuard/R8 güvenli).
 */
class LayoutPayloadTypeAdapter(private val gson: Gson) : TypeAdapter<LayoutPayload>() {

    override fun write(out: JsonWriter, value: LayoutPayload?) {
        if (value == null) {
            out.nullValue()
            return
        }
        out.beginObject()
        value.version?.let { out.name("version").value(it.toLong()) }
        value.backgroundColor?.let { out.name("backgroundColor").value(it) }
        value.components?.let { list ->
            out.name("components")
            out.beginArray()
            for (comp in list) {
                gson.toJson(comp, LayoutComponent::class.java, out)
            }
            out.endArray()
        }
        value.slides?.let { list ->
            out.name("slides")
            out.beginArray()
            for (slide in list) {
                gson.toJson(slide, LayoutSlide::class.java, out)
            }
            out.endArray()
        }
        out.endObject()
    }

    override fun read(reader: JsonReader): LayoutPayload? {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull()
            return null
        }
        var version: Int? = null
        var backgroundColor: String? = null
        var components: List<LayoutComponent>? = null
        var slides: List<LayoutSlide>? = null
        reader.beginObject()
        while (reader.hasNext()) {
            when (reader.nextName()) {
                "version" -> version = readVersionSafe(reader)
                "backgroundColor" -> backgroundColor = reader.nextString()
                "components" -> components = readComponentsArray(reader)
                "slides" -> slides = readSlidesArray(reader)
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        return LayoutPayload(version = version, backgroundColor = backgroundColor, components = components, slides = slides)
    }

    private fun readSlidesArray(reader: JsonReader): List<LayoutSlide>? {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull()
            return null
        }
        val list = ArrayList<LayoutSlide>()
        reader.beginArray()
        while (reader.hasNext()) {
            val slide: LayoutSlide? = gson.fromJson(reader, LayoutSlide::class.java)
            if (slide != null) list.add(slide)
        }
        reader.endArray()
        return list
    }

    /** API bazen version'ı string (ISO tarih/hash) gönderir; nextInt() "For input string" hatası verir. */
    private fun readVersionSafe(reader: JsonReader): Int? {
        return when (reader.peek()) {
            JsonToken.NUMBER -> try { reader.nextInt() } catch (_: NumberFormatException) { null }
            JsonToken.STRING -> try { reader.nextString().toIntOrNull() } catch (_: NumberFormatException) { null }
            else -> { reader.skipValue(); null }
        }
    }

    private fun readComponentsArray(reader: JsonReader): List<LayoutComponent>? {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull()
            return null
        }
        val list = ArrayList<LayoutComponent>()
        reader.beginArray()
        while (reader.hasNext()) {
            val comp: LayoutComponent? = gson.fromJson(reader, LayoutComponent::class.java)
            if (comp != null) list.add(comp)
        }
        reader.endArray()
        return list
    }
}
