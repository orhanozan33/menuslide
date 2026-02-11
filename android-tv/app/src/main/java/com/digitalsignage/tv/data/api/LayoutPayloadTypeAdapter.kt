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
        reader.beginObject()
        while (reader.hasNext()) {
            when (reader.nextName()) {
                "version" -> version = reader.nextInt()
                "backgroundColor" -> backgroundColor = reader.nextString()
                "components" -> components = readComponentsArray(reader)
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        return LayoutPayload(version = version, backgroundColor = backgroundColor, components = components)
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
