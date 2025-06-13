package com.example.rmtfinder

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.rmtfinder.databinding.ActivityProfileBinding
import com.example.rmtfinder.network.RetrofitClient
import kotlinx.coroutines.launch

class ProfileActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProfileBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)

binding.mapButton.setOnClickListener {
            val address = binding.practiceText.text.toString()
            val intent = Intent(this, MapActivity::class.java)
            intent.putExtra("address", address)
            startActivity(intent)
        }
        setContentView(binding.root)

        val id = intent.getStringExtra("id") ?: return

        lifecycleScope.launch {
            val profile = RetrofitClient.api.getProfile(id)
            binding.nameText.text = "${profile.firstName} ${profile.lastName}"
            binding.statusText.text = profile.registrationStatus
            binding.languageText.text = profile.languagesOfCare.joinToString()

            val place = profile.placesOfPractice.firstOrNull()
            if (place != null) {
                binding.practiceText.text = place.employerName ?: "N/A"
                binding.phoneText.text = place.phone ?: "No phone"
            }
        }
    }
}
