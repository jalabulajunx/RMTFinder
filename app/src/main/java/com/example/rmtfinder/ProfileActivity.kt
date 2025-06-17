package com.example.rmtfinder

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.rmtfinder.databinding.ActivityProfileBinding
import com.example.rmtfinder.network.RetrofitClient
import kotlinx.coroutines.launch

class ProfileActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProfileBinding
    private var currentAddress: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val id = intent.getStringExtra("id") ?: return

        lifecycleScope.launch {
            try {
                val profile = RetrofitClient.api.getProfile(id)
                binding.nameText.text = "${profile.firstName} ${profile.lastName}"
                binding.statusText.text = profile.registrationStatus
                binding.languageText.text = profile.languagesOfCare.joinToString()

                val place = profile.placesOfPractice.firstOrNull()
                if (place != null) {
                    binding.practiceText.text = place.employerName ?: "N/A"
                    binding.phoneText.text = place.phone ?: "No phone"
                    
                    // Build a proper address string for geocoding
                    val addressParts = mutableListOf<String>()
                    place.employerName?.let { addressParts.add(it) }
                    place.businessAddress?.let { addressParts.add(it) }
                    place.city?.let { addressParts.add(it) }
                    
                    currentAddress = addressParts.joinToString(", ")
                    if (currentAddress.isNotEmpty()) {
                        binding.mapButton.isEnabled = true
                    } else {
                        binding.mapButton.isEnabled = false
                    }
                } else {
                    binding.mapButton.isEnabled = false
                }
            } catch (e: Exception) {
                binding.practiceText.text = "Error loading profile"
                binding.mapButton.isEnabled = false
            }
        }

        binding.mapButton.setOnClickListener {
            if (currentAddress.isNotEmpty()) {
                val intent = Intent(this, MapActivity::class.java)
                intent.putExtra("address", currentAddress)
                startActivity(intent)
            }
        }
    }
}
