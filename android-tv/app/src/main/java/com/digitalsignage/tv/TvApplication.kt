package com.digitalsignage.tv

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class TvApplication : Application() {

    override fun onCreate() {
        super.onCreate()
    }
}
