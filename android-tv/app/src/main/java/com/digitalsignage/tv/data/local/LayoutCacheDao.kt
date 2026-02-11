package com.digitalsignage.tv.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface LayoutCacheDao {

    @Query("SELECT * FROM layout_cache WHERE id = 1 LIMIT 1")
    suspend fun getCachedLayout(): LayoutCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: LayoutCacheEntity)
}
