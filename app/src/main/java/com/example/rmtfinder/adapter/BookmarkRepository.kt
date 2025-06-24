package com.example.rmtfinder.adapter

import android.content.Context
import com.example.rmtfinder.model.AppDatabase
import com.example.rmtfinder.model.BookmarkedRMT
import kotlinx.coroutines.flow.Flow

class BookmarkRepository(context: Context) {
    private val dao = AppDatabase.getInstance(context).bookmarkDao()

    suspend fun addBookmark(profileId: String) {
        dao.insert(BookmarkedRMT(profileId))
    }

    suspend fun removeBookmark(profileId: String) {
        dao.delete(BookmarkedRMT(profileId))
    }

    fun isBookmarked(profileId: String): Flow<Boolean> = dao.isBookmarked(profileId)

    fun getAllBookmarks(): Flow<List<BookmarkedRMT>> = dao.getAllBookmarks()
} 