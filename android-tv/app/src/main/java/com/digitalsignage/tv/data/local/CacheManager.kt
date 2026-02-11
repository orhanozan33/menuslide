package com.digitalsignage.tv.data.local

import android.content.Context
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CacheManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val mediaCacheDir: File by lazy {
        File(context.filesDir, "media_cache").apply { if (!exists()) mkdirs() }
    }

    fun getCachedFile(url: String): File? {
        val name = urlToFileName(url)
        val f = File(mediaCacheDir, name)
        return if (f.exists()) f else null
    }

    suspend fun cacheFileFromUrl(url: String, checksum: String? = null): File? = withContext(Dispatchers.IO) {
        try {
            val name = urlToFileName(url)
            val out = File(mediaCacheDir, name)
            val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
            conn.connectTimeout = 15_000
            conn.readTimeout = 20_000
            try {
                if (conn.responseCode != 200) return@withContext null
                conn.inputStream.use { input ->
                    out.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
            } finally {
                conn.disconnect()
            }
            if (checksum != null) {
                val computed = sha256Hex(out.readBytes())
                if (computed != checksum) {
                    out.delete()
                    return@withContext null
                }
            }
            out
        } catch (e: Exception) {
            Log.e(TAG, "cacheFileFromUrl failed: $url", e)
            null
        }
    }

    private fun urlToFileName(url: String): String {
        val hash = MessageDigest.getInstance("SHA-256").digest(url.toByteArray())
        val ext = url.substringAfterLast('.', "").take(4)
        return hash.take(32).joinToString("") { "%02x".format(it) } + if (ext.isNotEmpty()) ".$ext" else ""
    }

    private fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    fun clearOldCache(maxAgeMs: Long = 7 * 24 * 60 * 60 * 1000L) {
        mediaCacheDir.listFiles()?.forEach { f ->
            if (f.lastModified() < System.currentTimeMillis() - maxAgeMs) f.delete()
        }
    }

    companion object {
        private const val TAG = "CacheManager"
    }
}
