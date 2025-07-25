package com.example.rmtfinder

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.rmtfinder.adapter.ProfileAdapter
import com.example.rmtfinder.databinding.ActivityMainBinding
import com.example.rmtfinder.viewmodel.MainViewModel
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.*
import com.google.android.material.bottomnavigation.BottomNavigationView
import androidx.core.view.WindowCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var viewModel: MainViewModel
    private lateinit var adapter: ProfileAdapter
    private lateinit var fusedLocationClient: FusedLocationProviderClient

    private val LOCATION_PERMISSION_CODE = 1001

    // State preservation variables
    private var isReturningFromBookmarks = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Edge-to-edge fullscreen
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, insets ->
            val systemInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.updatePadding(top = systemInsets.top, bottom = systemInsets.bottom)
            insets
        }

        // Hide the ActionBar for fullscreen
        supportActionBar?.hide()

        val bottomNav = findViewById<BottomNavigationView>(R.id.bottom_nav)
        bottomNav.selectedItemId = R.id.nav_search
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_search -> true
                R.id.nav_bookmarks -> {
                    isReturningFromBookmarks = true // Mark that we're going to bookmarks
                    startActivity(Intent(this, BookmarkedActivity::class.java))
                    true
                }
                else -> false
            }
        }

        adapter = ProfileAdapter {
            val intent = Intent(this, ProfileActivity::class.java)
            intent.putExtra("id", it.profileId)
            startActivity(intent)
        }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        binding.recyclerView.addOnScrollListener(object : androidx.recyclerview.widget.RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: androidx.recyclerview.widget.RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                val layoutManager = recyclerView.layoutManager as androidx.recyclerview.widget.LinearLayoutManager
                val visibleItemCount = layoutManager.childCount
                val totalItemCount = layoutManager.itemCount
                val firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition()

                if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount && firstVisibleItemPosition >= 0) {
                    viewModel.loadNextPage()
                }
            }
        })

        viewModel = ViewModelProvider(this)[MainViewModel::class.java]

        binding.searchButton.setOnClickListener {
            val keyword = binding.searchInput.text.toString().trim()
            if (keyword.isNotEmpty()) {
                Log.d("MainActivity", "Search button clicked with keyword: $keyword")
                viewModel.search(keyword)
            } else {
                Toast.makeText(this, "Please enter a search term", Toast.LENGTH_SHORT).show()
            }
        }

        binding.nearMeButton.setOnClickListener {
            fetchLocationAndSearch()
        }

        // Observe results
        viewModel.results.observe(this) { results ->
            Log.d("MainActivity", "Results updated: ${results.size} items")
            adapter.submitList(results)
        }

        // Observe loading state
        viewModel.isLoading.observe(this) { isLoading ->
            binding.searchButton.isEnabled = !isLoading
            binding.nearMeButton.isEnabled = !isLoading
            if (isLoading) {
                binding.searchButton.text = "Searching..."
            } else {
                binding.searchButton.text = getString(R.string.search_button)
            }
        }

        // Observe error state
        viewModel.error.observe(this) { error ->
            error?.let {
                Log.e("MainActivity", "Error: $it")
                Toast.makeText(this, it, Toast.LENGTH_LONG).show()
                viewModel.clearError()
            }
        }

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
    }

    override fun onResume() {
        super.onResume()

        // Only reset bottom navigation when returning from bookmarks
        if (isReturningFromBookmarks) {
            val bottomNav = findViewById<BottomNavigationView>(R.id.bottom_nav)
            bottomNav.selectedItemId = R.id.nav_search
            isReturningFromBookmarks = false // Reset the flag
        }

        // Don't clear search results - they are preserved in the ViewModel
        Log.d("MainActivity", "onResume called - preserving existing search results")
    }

    private fun fetchLocationAndSearch() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                LOCATION_PERMISSION_CODE)
        } else {
            fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                location?.let {
                    val cityName = getCityName(it)
                    if (cityName != null) {
                        binding.searchInput.setText(cityName)
                        viewModel.search(cityName)
                    } else {
                        Toast.makeText(this, "Unable to detect city", Toast.LENGTH_SHORT).show()
                    }
                } ?: Toast.makeText(this, "Location unavailable", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun getCityName(location: Location): String? {
        return try {
            val geocoder = Geocoder(this, Locale.getDefault())
            val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
            addresses?.firstOrNull()?.locality
        } catch (e: Exception) {
            null
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_CODE) {
            if ((grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED)) {
                fetchLocationAndSearch()
            } else {
                Toast.makeText(this, "Permission denied", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_bookmarks -> {
                isReturningFromBookmarks = true
                startActivity(Intent(this, BookmarkedActivity::class.java))
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}