package com.digitalsignage.tv.di

import android.content.Context
import com.digitalsignage.tv.layout.LayoutRenderer
import com.google.gson.Gson
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object LayoutModule {

    @Provides
    @Singleton
    fun provideLayoutRenderer(@ApplicationContext context: Context, gson: Gson): LayoutRenderer =
        LayoutRenderer(context, gson)
}
