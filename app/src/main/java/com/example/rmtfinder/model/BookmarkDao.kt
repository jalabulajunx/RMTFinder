package com.example.rmtfinder.model

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Delete
import kotlinx.coroutines.flow.Flow

@Dao
interface BookmarkDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(bookmark: BookmarkedRMT)

    @Delete
    suspend fun delete(bookmark: BookmarkedRMT)

    @Query("SELECT EXISTS(SELECT 1 FROM bookmarked_rmt WHERE profileId = :profileId)")
    fun isBookmarked(profileId: String): Flow<Boolean>

    @Query("SELECT * FROM bookmarked_rmt")
    fun getAllBookmarks(): Flow<List<BookmarkedRMT>>
} 