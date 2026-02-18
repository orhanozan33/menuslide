package com.digitalsignage.tv.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

/**
 * Enterprise device API. HTTPS only; certificate pinning can be added via OkHttp.
 * Web ile aynı layout: GET device/layout ile slides (template rotasyonları) alınır.
 */
interface ApiService {

    @GET("tv-app-config")
    suspend fun getTvAppConfig(): Response<TvAppConfigResponse>

    @GET("device/layout")
    suspend fun getLayout(@Header("x-device-token") deviceToken: String): Response<DeviceLayoutResponse>

    @POST("device/register")
    suspend fun register(@Body body: RegisterRequest): Response<RegisterResponse>

    @POST("device/heartbeat")
    suspend fun heartbeat(@Body body: HeartbeatRequest): Response<HeartbeatResponse>
}

/** GET device/layout yanıtı — web /api/layout ile aynı slides yapısı. */
data class DeviceLayoutResponse(
    val layout: LayoutPayload? = null,
    val layoutVersion: String? = null,
    val refreshIntervalSeconds: Int? = null
)

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

/** Backend bazen slides döner (slayt carousel), bazen components. */
data class LayoutPayload(
    val version: Int? = null,
    val type: String? = null,
    val videoUrl: String? = null,
    val backgroundColor: String? = null,
    val components: List<LayoutComponent>? = null,
    val slides: List<LayoutSlide>? = null
)

data class LayoutSlide(
    val type: String? = null,
    val url: String? = null,
    val title: String? = null,
    val description: String? = null,
    val duration: Int = 10,
    val transition_effect: String? = null,
    val transition_duration: Int? = null
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
