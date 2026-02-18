package com.digitalsignage.tv.data.api

import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter

/**
 * TvAppConfigResponse için güvenli parse: minVersionCode ve latestVersionCode
 * API/Supabase bazen sayı yerine string döndüğü için hem Int hem String kabul eder.
 */
class TvAppConfigResponseTypeAdapter : TypeAdapter<TvAppConfigResponse>() {

    override fun write(out: JsonWriter, value: TvAppConfigResponse?) {
        if (value == null) {
            out.nullValue()
            return
        }
        out.beginObject()
        value.apiBaseUrl?.let { out.name("apiBaseUrl").value(it) }
        value.downloadUrl?.let { out.name("downloadUrl").value(it) }
        value.minVersionCode?.let { out.name("minVersionCode").value(it.toLong()) }
        value.latestVersionCode?.let { out.name("latestVersionCode").value(it.toLong()) }
        value.latestVersionName?.let { out.name("latestVersionName").value(it) }
        out.endObject()
    }

    override fun read(reader: JsonReader): TvAppConfigResponse? {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull()
            return null
        }
        var apiBaseUrl: String? = null
        var downloadUrl: String? = null
        var minVersionCode: Int? = null
        var latestVersionCode: Int? = null
        var latestVersionName: String? = null

        reader.beginObject()
        while (reader.hasNext()) {
            when (reader.nextName()) {
                "apiBaseUrl" -> apiBaseUrl = reader.nextString().takeIf { it.isNotBlank() }
                "downloadUrl" -> downloadUrl = reader.nextString().takeIf { it.isNotBlank() }
                "minVersionCode" -> minVersionCode = readIntOrString(reader)
                "latestVersionCode" -> latestVersionCode = readIntOrString(reader)
                "latestVersionName" -> latestVersionName = reader.nextString().trim().takeIf { it.isNotBlank() }
                else -> reader.skipValue()
            }
        }
        reader.endObject()

        return TvAppConfigResponse(
            apiBaseUrl = apiBaseUrl,
            downloadUrl = downloadUrl,
            minVersionCode = minVersionCode,
            latestVersionCode = latestVersionCode,
            latestVersionName = latestVersionName
        )
    }

    private fun readIntOrString(reader: JsonReader): Int? {
        return when (reader.peek()) {
            JsonToken.NUMBER -> reader.nextInt()
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
