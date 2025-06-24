package com.example.rmtfinder.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "bookmarked_rmt")
data class BookmarkedRMT(
    @PrimaryKey val profileId: String
) 