package com.example.rmtfinder

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.rmtfinder.adapter.BookmarkRepository
import com.example.rmtfinder.adapter.ProfileAdapter
import com.example.rmtfinder.databinding.ActivityMainBinding
import com.example.rmtfinder.model.ResultItem
import com.example.rmtfinder.viewmodel.MainViewModel
import com.google.android.material.bottomnavigation.BottomNavigationView
import androidx.core.view.WindowCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import androidx.lifecycle.lifecycleScope

class BookmarkedActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: ProfileAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_bookmarked)

        // Edge-to-edge fullscreen
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        val root = findViewById<android.view.View>(android.R.id.content)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val systemInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.updatePadding(top = systemInsets.top, bottom = systemInsets.bottom)
            insets
        }

        val recyclerView = findViewById<androidx.recyclerview.widget.RecyclerView>(R.id.recycler_view)
        val emptyView = findViewById<android.widget.TextView>(R.id.empty_view)
        val bottomNav = findViewById<BottomNavigationView>(R.id.bottom_nav)

        adapter = ProfileAdapter {
            val intent = android.content.Intent(this, ProfileActivity::class.java)
            intent.putExtra("id", it.profileId)
            startActivity(intent)
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        val bookmarkRepo = BookmarkRepository(this)
        lifecycleScope.launch {
            bookmarkRepo.getAllBookmarks().collectLatest { bookmarks ->
                val items = bookmarks.map { b ->
                    ResultItem(
                        profileId = b.profileId,
                        firstName = "Bookmarked",
                        lastName = "RMT",
                        practiceLocation = "",
                        authorizedToPractice = false,
                        publicRegisterAlert = false
                    )
                }
                adapter.submitList(items)
                if (items.isEmpty()) {
                    emptyView.visibility = android.view.View.VISIBLE
                    recyclerView.visibility = android.view.View.GONE
                } else {
                    emptyView.visibility = android.view.View.GONE
                    recyclerView.visibility = android.view.View.VISIBLE
                }
            }
        }

        bottomNav.selectedItemId = R.id.nav_bookmarks
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_search -> {
                    startActivity(android.content.Intent(this, MainActivity::class.java).addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP))
                    true
                }
                R.id.nav_bookmarks -> true
                else -> false
            }
        }
    }
} 