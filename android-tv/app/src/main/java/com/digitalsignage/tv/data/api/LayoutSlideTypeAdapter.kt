package com.digitalsignage.tv.data.api

import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter

/**
 * LayoutSlide için güvenli parse: duration ve transition_duration API'den bazen string gelir;
 * slayt kaybı olmasın, web ile aynı sayıda slayt gösterilsin.
 */
class LayoutSlideTypeAdapter : TypeAdapter<LayoutSlide>() {

    override fun write(out: JsonWriter, value: LayoutSlide?) {
        if (value == null) {
            out.nullValue()
            return
        }
        out.beginObject()
        value.type?.let { out.name("type").value(it) }
        value.url?.let { out.name("url").value(it) }
        value.title?.let { out.name("title").value(it) }
        value.description?.let { out.name("description").value(it) }
        out.name("duration").value(value.duration.toLong())
        value.transition_effect?.let { out.name("transition_effect").value(it) }
        value.transition_duration?.let { out.name("transition_duration").value(it.toLong()) }
        out.endObject()
    }

    override fun read(reader: JsonReader): LayoutSlide? {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull()
            return null
        }
        var type: String? = null
        var url: String? = null
        var title: String? = null
        var description: String? = null
        var duration = 5
        var transition_effect: String? = null
        var transition_duration: Int? = null

        reader.beginObject()
        while (reader.hasNext()) {
            when (reader.nextName()) {
                "type" -> type = reader.nextString().trim().takeIf { it.isNotEmpty() }
                "url" -> url = reader.nextString().trim().takeIf { it.isNotEmpty() }
                "title" -> title = reader.nextString().trim().takeIf { it.isNotEmpty() }
                "description" -> description = reader.nextString().trim().takeIf { it.isNotEmpty() }
                "duration" -> duration = readIntOrString(reader) ?: 5
                "transition_effect" -> transition_effect = reader.nextString().trim().takeIf { it.isNotEmpty() }
                "transition_duration" -> transition_duration = readIntOrString(reader)
                else -> reader.skipValue()
            }
        }
        reader.endObject()

        return LayoutSlide(
            type = type,
            url = url,
            title = title,
            description = description,
            duration = duration.coerceAtLeast(1),
            transition_effect = transition_effect,
            transition_duration = transition_duration
        )
    }

    private fun readIntOrString(reader: JsonReader): Int? {
        return when (reader.peek()) {
            JsonToken.NUMBER -> try { reader.nextInt() } catch (_: NumberFormatException) { null }
            JsonToken.STRING -> reader.nextString().toIntOrNull()
            JsonToken.NULL -> {
                reader.nextNull()
                null
            }
            else -> {
                reader.skipValue()
                null
            }
        }
    }
}
