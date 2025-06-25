package com.example.rmtfinder

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.rmtfinder.adapter.BookmarkRepository
import com.example.rmtfinder.adapter.ProfileAdapter
import com.example.rmtfinder.model.ResultItem
import com.example.rmtfinder.network.RetrofitClient
import com.google.android.material.bottomnavigation.BottomNavigationView
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class BookmarkedActivity : AppCompatActivity() {
    private lateinit var adapter: ProfileAdapter
    private lateinit var bookmarkRepo: BookmarkRepository
    private lateinit var progressBar: ProgressBar

    private lateinit var loadingContainer: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_bookmarked)

        // Hide the ActionBar for fullscreen
        supportActionBar?.hide()

        // Edge-to-edge fullscreen
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT

        val root = findViewById<View>(android.R.id.content)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val systemInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.updatePadding(top = systemInsets.top, bottom = systemInsets.bottom)
            insets
        }

        // Initialize views using findViewById
        val recyclerView = findViewById<RecyclerView>(R.id.recycler_view)
        val emptyView = findViewById<TextView>(R.id.empty_view)
        val bottomNav = findViewById<BottomNavigationView>(R.id.bottom_nav)

        // Get loading container from layout
        loadingContainer = findViewById<View>(R.id.loading_container)
        progressBar = findViewById<ProgressBar>(R.id.progress_bar)

        // Initialize repository
        bookmarkRepo = BookmarkRepository(this)

        // Setup adapter
        adapter = ProfileAdapter { resultItem ->
            val intent = Intent(this, ProfileActivity::class.java)
            intent.putExtra("id", resultItem.profileId)
            startActivity(intent)
        }

        // Setup RecyclerView
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        // Setup bottom navigation
        bottomNav.selectedItemId = R.id.nav_bookmarks
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_search -> {
                    finish() // Just finish this activity to return to MainActivity
                    true
                }
                R.id.nav_bookmarks -> true
                else -> false
            }
        }

        // Load bookmarked RMTs
        loadBookmarkedRMTs(recyclerView, emptyView)
    }

    private fun loadBookmarkedRMTs(recyclerView: RecyclerView, emptyView: TextView) {
        showLoading(true)

        lifecycleScope.launch {
            try {
                bookmarkRepo.getAllBookmarks()
                    .catch { exception ->
                        Log.e("BookmarkedActivity", "Error loading bookmarks", exception)
                        showLoading(false)
                        showEmptyState(recyclerView, emptyView, "Error loading bookmarks")
                    }
                    .collectLatest { bookmarks ->
                        Log.d("BookmarkedActivity", "Loaded ${bookmarks.size} bookmarks")

                        if (bookmarks.isEmpty()) {
                            showLoading(false)
                            showEmptyState(recyclerView, emptyView, "No RMTs bookmarked")
                        } else {
                            // Load full profile data for bookmarked RMTs
                            loadBookmarkedProfiles(bookmarks.map { it.profileId }, recyclerView, emptyView)
                        }
                    }
            } catch (e: Exception) {
                Log.e("BookmarkedActivity", "Failed to collect bookmarks", e)
                showLoading(false)
                showEmptyState(recyclerView, emptyView, "Failed to load bookmarks")
            }
        }
    }

    private fun loadBookmarkedProfiles(profileIds: List<String>, recyclerView: RecyclerView, emptyView: TextView) {
        lifecycleScope.launch {
            try {
                val resultItems = mutableListOf<ResultItem>()

                for (profileId in profileIds) {
                    try {
                        Log.d("BookmarkedActivity", "Loading profile: $profileId")
                        val profile = RetrofitClient.api.getProfile(profileId)

                        // Get primary practice location
                        val primaryLocation = profile.primaryPlacesOfPractice?.firstOrNull()
                            ?: profile.placesOfPractice?.firstOrNull()

                        val practiceLocation = when {
                            !primaryLocation?.city.isNullOrBlank() -> {
                                listOfNotNull(
                                    primaryLocation?.employerName,
                                    primaryLocation?.city,
                                    primaryLocation?.province
                                ).joinToString(", ")
                            }
                            !profile.city.isNullOrBlank() -> profile.city
                            else -> "No location available"
                        }

                        // Parse authorization status - API can return various string values
                        val isAuthorized = when (profile.authorizedToPractice?.lowercase()?.trim()) {
                            "1", "true", "yes", "y", "authorized", "active" -> true
                            "0", "false", "no", "n", "not authorized", "inactive" -> false
                            else -> {
                                // Fallback: check registration status
                                val regStatus = profile.registrationStatus?.lowercase()?.trim()
                                regStatus == "active" || regStatus == "current" || regStatus == "registered"
                            }
                        }

                        Log.d("BookmarkedActivity", "Profile $profileId - authorizedToPractice: '${profile.authorizedToPractice}', registrationStatus: '${profile.registrationStatus}', computed authorized: $isAuthorized")

                        val resultItem = ResultItem(
                            profileId = profileId,
                            firstName = profile.firstName ?: "",
                            lastName = profile.lastName ?: "",
                            practiceLocation = practiceLocation,
                            authorizedToPractice = isAuthorized,
                            publicRegisterAlert = profile.hasPublicNotices == true
                        )
                        resultItems.add(resultItem)
                        Log.d("BookmarkedActivity", "Added profile: ${resultItem.firstName} ${resultItem.lastName} - ${resultItem.practiceLocation}")

                    } catch (e: Exception) {
                        Log.e("BookmarkedActivity", "Failed to load profile $profileId", e)
                        // Add a placeholder item for failed profiles
                        val resultItem = ResultItem(
                            profileId = profileId,
                            firstName = "RMT",
                            lastName = "(Failed to load)",
                            practiceLocation = "Error loading data",
                            authorizedToPractice = false,
                            publicRegisterAlert = false
                        )
                        resultItems.add(resultItem)
                    }
                }

                // Update UI on main thread
                runOnUiThread {
                    showLoading(false)
                    // Create a completely new list to ensure adapter updates properly
                    val finalList = resultItems.toList()
                    Log.d("BookmarkedActivity", "Submitting ${finalList.size} items to adapter")
                    adapter.submitList(null) // Clear first
                    adapter.submitList(finalList) // Then set new data

                    if (finalList.isEmpty()) {
                        showEmptyState(recyclerView, emptyView, "No bookmarked RMTs found")
                    } else {
                        emptyView.visibility = View.GONE
                        recyclerView.visibility = View.VISIBLE
                    }
                }

            } catch (e: Exception) {
                Log.e("BookmarkedActivity", "Failed to load bookmarked profiles", e)
                runOnUiThread {
                    showLoading(false)
                    showEmptyState(recyclerView, emptyView, "Error loading bookmarked RMTs")
                }
            }
        }
    }

    private fun showLoading(show: Boolean) {
        runOnUiThread {
            loadingContainer.visibility = if (show) View.VISIBLE else View.GONE
        }
    }

    private fun showEmptyState(recyclerView: RecyclerView, emptyView: TextView, message: String) {
        runOnUiThread {
            emptyView.text = message
            emptyView.visibility = View.VISIBLE
            recyclerView.visibility = View.GONE
        }
    }
}