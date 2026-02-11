package com.digitalsignage.tv.data.api

import com.google.gson.Gson
import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter
import java.util.ArrayList

/**
 * RegisterResponse için manuel TypeAdapter.
 * videoUrls: List<String> generic tipini Gson reflection yerine manuel parse eder (ProGuard güvenli).
 */
class RegisterResponseTypeAdapter(
    private val gson: Gson,
    private val layoutPayloadAdapter: TypeAdapter<LayoutPayload>
) : TypeAdapter<RegisterResponse>() {

    override fun write(out: JsonWriter, value: RegisterResponse?) {
        if (value == null) {
            out.nullValue()
            return
        }
        out.beginObject()
        out.name("deviceToken").value(value.deviceToken)
        value.layout?.let { layout ->
            out.name("layout")
            layoutPayloadAdapter.write(out, layout)
        }
        value.videoUrls?.let { urls ->
            out.name("videoUrls")
            out.beginArray()
            for (url in urls) out.value(url)
            out.endArray()
        }
        out.name("refreshIntervalSeconds").value(value.refreshIntervalSeconds.toLong())
        out.endObject()
    }

    override fun read(reader: JsonReader): RegisterResponse? {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull()
            return null
        }
        var deviceToken = ""
        var layout: LayoutPayload? = null
        var videoUrls: List<String>? = null
        var refreshIntervalSeconds = 300

        reader.beginObject()
        while (reader.hasNext()) {
            when (reader.nextName()) {
                "deviceToken" -> deviceToken = reader.nextString()
                "layout" -> layout = layoutPayloadAdapter.read(reader)
                "videoUrls" -> videoUrls = readStringArray(reader)
                "refreshIntervalSeconds" -> refreshIntervalSeconds = reader.nextInt()
                else -> reader.skipValue()
            }
        }
        reader.endObject()

        return RegisterResponse(
            deviceToken = deviceToken,
            layout = layout,
            videoUrls = videoUrls,
            refreshIntervalSeconds = refreshIntervalSeconds
        )
    }

    private fun readStringArray(reader: JsonReader): List<String>? {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull()
            return null
        }
        val list = ArrayList<String>()
        reader.beginArray()
        while (reader.hasNext()) {
            list.add(reader.nextString())
        }
        reader.endArray()
        return list
    }
}
