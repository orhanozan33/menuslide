package com.digitalsignage.tv.di

import com.digitalsignage.tv.BuildConfig
import com.digitalsignage.tv.data.api.ApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import com.digitalsignage.tv.data.api.LayoutPayload
import com.digitalsignage.tv.data.api.LayoutPayloadTypeAdapter
import com.digitalsignage.tv.data.api.RegisterResponse
import com.digitalsignage.tv.data.api.RegisterResponseTypeAdapter
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    private const val BASE_URL = "https://menuslide.com/api/"

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .writeTimeout(25, TimeUnit.SECONDS)
        if (BuildConfig.DEBUG) {
            builder.addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BODY))
        }
        return builder.build()
    }

    @Provides
    @Singleton
    fun provideGson(): Gson {
        val plainGson = GsonBuilder().create()
        val layoutPayloadAdapter = LayoutPayloadTypeAdapter(plainGson)
        return GsonBuilder()
            .registerTypeAdapter(LayoutPayload::class.java, layoutPayloadAdapter)
            .registerTypeAdapter(
                RegisterResponse::class.java,
                RegisterResponseTypeAdapter(plainGson, layoutPayloadAdapter)
            )
            .create()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, gson: Gson): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService = retrofit.create(ApiService::class.java)
}
