package com.digitalsignage.tv.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "device")
data class DeviceEntity(
    @PrimaryKey val id: Int = 1,
    val deviceToken: String,
    val displayCode: String,
    val layoutJson: String?,
    val refreshIntervalSeconds: Int,
    val updatedAt: Long
)
