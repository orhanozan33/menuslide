package com.digitalsignage.tv.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * Enterprise device API. HTTPS only; certificate pinning can be added via OkHttp.
 */
interface ApiService {

    @GET("tv-app-config")
    suspend fun getTvAppConfig(): Response<TvAppConfigResponse>

    @POST("device/register")
    suspend fun register(@Body body: RegisterRequest): Response<RegisterResponse>

    @POST("device/heartbeat")
    suspend fun heartbeat(@Body body: HeartbeatRequest): Response<HeartbeatResponse>
}

data class RegisterRequest(
    val displayCode: String,
    val deviceId: String,
    val deviceModel: String? = null,
    val osVersion: String? = null
)

data class RegisterResponse(
    val deviceToken: String,
    val layout: LayoutPayload?,
    val videoUrls: List<String>? = null,
    val refreshIntervalSeconds: Int = 300
)

data class LayoutPayload(
    val version: Int? = null,
    val backgroundColor: String? = null,
    val components: List<LayoutComponent>? = null
)

data class LayoutComponent(
    val id: String? = null,
    val type: String,
    val x: Int = 0,
    val y: Int = 0,
    val width: Int = 0,
    val height: Int = 0,
    val zIndex: Int = 0,
    val videoUrl: String? = null,
    val imageUrl: String? = null,
    val text: String? = null,
    val textColor: String? = null,
    val textSize: Float = 16f,
    val backgroundColor: String? = null
)

data class HeartbeatRequest(
    val deviceToken: String,
    val ramUsageMb: Long? = null,
    val playbackStatus: String? = null,
    val appVersion: String? = null,
    val lastError: String? = null
)

data class HeartbeatResponse(
    val ok: Boolean? = true
)

data class TvAppConfigResponse(
    val apiBaseUrl: String? = null,
    val downloadUrl: String? = null,
    val minVersionCode: Int? = null,
    val latestVersionCode: Int? = null,
    val latestVersionName: String? = null
)
