package com.example.rmtfinder

import android.location.Geocoder
import android.os.Bundle
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMapBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val address = intent.getStringExtra("address") ?: return

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)

        geocodeAddress(address)
    }

    private fun geocodeAddress(addressStr: String) {
        val geocoder = Geocoder(this, Locale.getDefault())
        val locations = geocoder.getFromLocationName(addressStr, 1)
        if (!locations.isNullOrEmpty()) {
            val loc = locations[0]
            val position = LatLng(loc.latitude, loc.longitude)
            googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(position, 15f))
            googleMap.addMarker(MarkerOptions().position(position).title("Practice Location"))
        }
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
    }
}
