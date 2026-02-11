package com.digitalsignage.tv.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface DeviceDao {

    @Query("SELECT * FROM device WHERE id = 1 LIMIT 1")
    suspend fun getDevice(): DeviceEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(device: DeviceEntity)

    @Query("DELETE FROM device")
    suspend fun deleteAll()
}
