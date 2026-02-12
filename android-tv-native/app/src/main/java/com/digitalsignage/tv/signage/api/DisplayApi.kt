package com.digitalsignage.tv.signage.api

import com.digitalsignage.tv.signage.data.DisplayConfig
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface DisplayApi {
    @GET("api/display/{code}")
    suspend fun getDisplayConfig(@Path("code") code: String): Response<DisplayConfig>
}
