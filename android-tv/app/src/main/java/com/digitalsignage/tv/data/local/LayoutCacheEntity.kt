package com.digitalsignage.tv.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "layout_cache")
data class LayoutCacheEntity(
    @PrimaryKey val id: Int = 1,
    val layoutJson: String,
    val version: Int,
    val updatedAt: Long
)
