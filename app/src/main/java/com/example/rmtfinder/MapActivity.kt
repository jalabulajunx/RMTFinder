package com.example.rmtfinder

import android.location.Geocoder
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.rmtfinder.databinding.ActivityMapBinding
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import java.util.*

class MapActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var binding: ActivityMapBinding
    private lateinit var googleMap: GoogleMap
    private var addressToGeocode: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMapBinding.inflate(layoutInflater)
        setContentView(binding.root)

        addressToGeocode = intent.getStringExtra("address") ?: ""
        
        if (addressToGeocode.isEmpty()) {
            Toast.makeText(this, "No address provided", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    private fun geocodeAddress(addressStr: String) {
        try {
            val geocoder = Geocoder(this, Locale.getDefault())
            val locations = geocoder.getFromLocationName(addressStr, 1)
            
            if (!locations.isNullOrEmpty()) {
                val loc = locations[0]
                val position = LatLng(loc.latitude, loc.longitude)
                googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(position, 15f))
                googleMap.addMarker(MarkerOptions().position(position).title("Practice Location"))
            } else {
                Toast.makeText(this, "Could not find location for: $addressStr", Toast.LENGTH_LONG).show()
                // Set a default location (Toronto) if geocoding fails
                val defaultLocation = LatLng(43.6532, -79.3832)
                googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(defaultLocation, 10f))
                googleMap.addMarker(MarkerOptions().position(defaultLocation).title("Default Location"))
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Error finding location: ${e.message}", Toast.LENGTH_LONG).show()
            // Set a default location (Toronto) if geocoding fails
            val defaultLocation = LatLng(43.6532, -79.3832)
            googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(defaultLocation, 10f))
            googleMap.addMarker(MarkerOptions().position(defaultLocation).title("Default Location"))
        }
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        geocodeAddress(addressToGeocode)
    }
}
