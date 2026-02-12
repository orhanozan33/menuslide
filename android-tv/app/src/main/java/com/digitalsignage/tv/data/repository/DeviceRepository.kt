package com.digitalsignage.tv.data.repository

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import android.util.Log
import com.digitalsignage.tv.BuildConfig
import com.digitalsignage.tv.data.api.ApiService
import com.digitalsignage.tv.data.api.RegisterRequest
import com.digitalsignage.tv.data.api.RegisterResponse
import com.digitalsignage.tv.data.api.TvAppConfigResponse
import com.digitalsignage.tv.data.local.CacheManager
import com.digitalsignage.tv.data.local.DeviceDao
import com.digitalsignage.tv.data.local.DeviceEntity
import com.digitalsignage.tv.data.local.LayoutCacheDao
import com.digitalsignage.tv.data.local.LayoutCacheEntity
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
    private val deviceDao: DeviceDao,
    private val layoutCacheDao: LayoutCacheDao,
    private val cacheManager: CacheManager,
    private val gson: Gson
) {
    private val prefs by lazy {
        try {
            val keyGenParameterSpec = MasterKeys.AES256_GCM_SPEC
            val masterKeyAlias = MasterKeys.getOrCreate(keyGenParameterSpec)
            EncryptedSharedPreferences.create(
                "device_secure",
                masterKeyAlias,
                context,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Throwable) {
            Log.w("DeviceRepo", "EncryptedSharedPreferences failed, using plain", e)
            context.getSharedPreferences("device_secure", Context.MODE_PRIVATE)
        }
    }

    private val deviceId: String
        get() = prefs.getString(KEY_DEVICE_ID, null) ?: UUID.randomUUID().toString().also {
            prefs.edit().putString(KEY_DEVICE_ID, it).apply()
        }

    fun getDeviceToken(): String? = prefs.getString(KEY_DEVICE_TOKEN, null)

    fun saveDeviceToken(token: String) {
        prefs.edit().putString(KEY_DEVICE_TOKEN, token).apply()
    }

    fun getDisplayUrl(): String? = prefs.getString(KEY_DISPLAY_URL, null)

    fun saveDisplayUrl(url: String?) {
        prefs.edit().putString(KEY_DISPLAY_URL, url ?: "").apply()
    }

    suspend fun clearActivation() {
        prefs.edit().remove(KEY_DEVICE_TOKEN).remove(KEY_DISPLAY_URL).apply()
        withContext(Dispatchers.IO) { deviceDao.deleteAll() }
    }

    suspend fun register(displayCode: String): Result<RegisterResponse> = withContext(Dispatchers.IO) {
        try {
            val req = RegisterRequest(
                displayCode = displayCode.trim(),
                deviceId = deviceId,
                deviceModel = android.os.Build.MODEL,
                osVersion = android.os.Build.VERSION.RELEASE
            )
            val res = api.register(req)
            if (res.isSuccessful) {
                val body = res.body() ?: return@withContext Result.failure(NullPointerException("Empty body"))
                saveDeviceToken(body.deviceToken)
                val displayUrl = body.videoUrls?.firstOrNull()?.trim()?.takeIf { it.isNotEmpty() }
                saveDisplayUrl(displayUrl)
                addRecentCode(displayCode.trim())
                val layoutJson = body.layout?.let { gson.toJson(it) }
                deviceDao.insert(
                    DeviceEntity(
                        deviceToken = body.deviceToken,
                        displayCode = displayCode.trim(),
                        layoutJson = layoutJson,
                        refreshIntervalSeconds = body.refreshIntervalSeconds,
                        updatedAt = System.currentTimeMillis()
                    )
                )
                layoutJson?.let { json ->
                    layoutCacheDao.insert(
                        LayoutCacheEntity(
                            layoutJson = json,
                            version = body.layout?.version ?: 0,
                            updatedAt = System.currentTimeMillis()
                        )
                    )
                }
                Result.success(body)
            } else {
                val code = res.code()
                val errorBody = res.errorBody()?.string()?.trim()
                val msg = when (code) {
                    404 -> errorBody?.takeIf { it.contains("CODE_NOT_FOUND") }?.let { "CODE_NOT_FOUND" }
                        ?: "Display code not found or screen inactive."
                    400 -> "Invalid request. Enter the 5-digit display code."
                    500 -> "Server error. Try again later."
                    else -> errorBody?.take(200) ?: "Register failed: $code ${res.message()}"
                }
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            val msg = when {
                e.message?.contains("Unable to resolve host") == true -> "No internet. Check connection."
                e.message?.contains("Failed to connect") == true -> "Cannot reach server. Check URL and network."
                else -> e.message ?: "Connection failed."
            }
            Result.failure(Exception(msg))
        }
    }

    fun getCachedLayoutFlow(): Flow<String?> = flow {
        emit(withContext(Dispatchers.IO) { layoutCacheDao.getCachedLayout()?.layoutJson })
    }

    suspend fun getCachedLayoutJson(): String? = withContext(Dispatchers.IO) {
        layoutCacheDao.getCachedLayout()?.layoutJson
    }

    suspend fun getDeviceEntity(): DeviceEntity? = withContext(Dispatchers.IO) {
        deviceDao.getDevice()
    }

    suspend fun updateCachedLayout(layoutJson: String, version: Int) = withContext(Dispatchers.IO) {
        layoutCacheDao.insert(LayoutCacheEntity(layoutJson = layoutJson, version = version, updatedAt = System.currentTimeMillis()))
    }

    fun getCacheManager(): CacheManager = cacheManager

    suspend fun getTvAppConfig(): TvAppConfigResponse? = withContext(Dispatchers.IO) {
        try { api.getTvAppConfig().body() } catch (_: Exception) { null }
    }

    private val recentCodesMax = 10

    fun getRecentCodes(): List<String> {
        val raw = prefs.getString(KEY_RECENT_CODES, null) ?: return emptyList()
        return raw.split(',').map { it.trim() }.filter { it.isNotEmpty() }
    }

    fun addRecentCode(code: String) {
        if (code.isBlank()) return
        val current = getRecentCodes().toMutableList()
        current.remove(code)
        current.add(0, code)
        val trimmed = current.take(recentCodesMax)
        prefs.edit().putString(KEY_RECENT_CODES, trimmed.joinToString(",")).apply()
    }

    companion object {
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DISPLAY_URL = "display_url"
        private const val KEY_RECENT_CODES = "recent_codes"
    }
}
