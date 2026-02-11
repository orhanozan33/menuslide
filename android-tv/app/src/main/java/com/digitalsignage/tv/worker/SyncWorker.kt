package com.digitalsignage.tv.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Basit sync worker – Hilt yok; uygulama açılışında çökme önlendi.
 * İleride gerekirse API çağrısı eklenebilir.
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Result.success()
    }
}
