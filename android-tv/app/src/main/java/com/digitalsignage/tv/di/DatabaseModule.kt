package com.digitalsignage.tv.di

import android.content.Context
import androidx.room.Room
import com.digitalsignage.tv.data.local.AppDatabase
import com.digitalsignage.tv.data.local.DeviceDao
import com.digitalsignage.tv.data.local.LayoutCacheDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "signage_db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    @Singleton
    fun provideDeviceDao(db: AppDatabase): DeviceDao = db.deviceDao()

    @Provides
    @Singleton
    fun provideLayoutCacheDao(db: AppDatabase): LayoutCacheDao = db.layoutCacheDao()
}
