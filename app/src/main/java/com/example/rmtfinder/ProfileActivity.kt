package com.example.rmtfinder

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.rmtfinder.databinding.ActivityProfileBinding
import com.example.rmtfinder.network.RetrofitClient
import kotlinx.coroutines.launch
import android.view.View
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.text.util.Linkify
import android.text.SpannableString
import android.text.method.LinkMovementMethod
import android.content.Intent as AndroidIntent
import android.net.Uri
import androidx.core.content.ContextCompat
import com.google.android.material.color.MaterialColors
import android.widget.ImageButton
import com.example.rmtfinder.adapter.BookmarkManager

class ProfileActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProfileBinding
    private var currentAddress: String = ""
    private var profileId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val loadingOverlay = findViewById<View>(R.id.loading_overlay)
        loadingOverlay.visibility = View.VISIBLE

        val id = intent.getStringExtra("id") ?: return
        profileId = id

        lifecycleScope.launch {
            try {
                val profile = RetrofitClient.api.getProfile(id)
                // Hide loading overlay
                loadingOverlay.visibility = View.GONE

                // Personal Info
                binding.nameText.text = listOfNotNull(profile.firstName, profile.middleName, profile.lastName).joinToString(" ").trim()
                binding.statusText.text = profile.registrationStatus ?: ""
                binding.registrationNumberText.text = profile.registrationNumber?.let { "Reg #: $it" } ?: ""
                binding.genderText.text = profile.gender?.let { "Gender: $it" } ?: ""

                // Languages (ChipGroup)
                val chipGroup = findViewById<ChipGroup>(R.id.language_chip_group)
                chipGroup.removeAllViews()
                profile.languagesOfCare?.forEach { lang ->
                    val chip = Chip(this@ProfileActivity)
                    chip.text = lang
                    chip.isClickable = false
                    chip.isCheckable = false
                    val colorOnSurface = MaterialColors.getColor(chip, com.google.android.material.R.attr.colorOnSurface)
                    chip.setTextColor(colorOnSurface)
                    chipGroup.addView(chip)
                }

                // Practice Locations
                val practiceContainer = findViewById<LinearLayout>(R.id.practice_locations_container)
                practiceContainer.removeAllViews()
                profile.placesOfPractice?.forEach { place ->
                    val tv = TextView(this@ProfileActivity)
                    val address = listOfNotNull(
                        place.employerName,
                        place.businessAddress,
                        place.city,
                        place.province,
                        place.businessZipCode
                    ).joinToString(", ")
                    val phone = place.phone?.let { "\nPhone: $it" } ?: ""
                    val website = place.websiteURL?.let { "\nWebsite: ${place.websiteURL}" } ?: ""
                    tv.text = "$address$phone$website"
                    tv.setPadding(0, 8, 0, 8)

                    // Use theme color for normal text
                    val colorOnSurface = MaterialColors.getColor(tv, com.google.android.material.R.attr.colorOnSurface)
                    tv.setTextColor(colorOnSurface)

                    // Hyperlink website
                    if (!place.websiteURL.isNullOrEmpty()) {
                        val spannable = SpannableString(tv.text)
                        val start = tv.text.indexOf(place.websiteURL)
                        if (start >= 0) {
                            val end = start + place.websiteURL.length
                            spannable.setSpan(android.text.style.URLSpan(place.websiteURL), start, end, 0)
                        }
                        tv.text = spannable
                        tv.movementMethod = LinkMovementMethod.getInstance()
                    }

                    // Hyperlink address to Google Maps
                    if (address.isNotEmpty()) {
                        tv.setOnClickListener {
                            val gmmIntentUri = Uri.parse("geo:0,0?q=" + Uri.encode(address))
                            val mapIntent = AndroidIntent(AndroidIntent.ACTION_VIEW, gmmIntentUri)
                            mapIntent.setPackage("com.google.android.apps.maps")
                            try {
                                startActivity(mapIntent)
                            } catch (e: Exception) {
                                // fallback to any map app
                                startActivity(AndroidIntent(AndroidIntent.ACTION_VIEW, gmmIntentUri))
                            }
                        }
                        // Use theme color for links
                        val colorPrimary = MaterialColors.getColor(tv, com.google.android.material.R.attr.colorPrimary)
                        tv.setTextColor(colorPrimary)
                        tv.paint.isUnderlineText = true
                    }

                    practiceContainer.addView(tv)
                }

                // Registration History
                val regHistoryContainer = findViewById<LinearLayout>(R.id.registration_history_container)
                regHistoryContainer.removeAllViews()
                profile.registrationHistory?.forEach { reg ->
                    val tv = TextView(this@ProfileActivity)
                    val period = "${reg.effectiveDate?.substring(0, 10)} to ${reg.expiryDate?.substring(0, 10)}"
                    tv.text = "${reg.classOfRegistration} (${reg.registrationStatus})\n$period"
                    tv.setPadding(0, 8, 0, 8)
                    regHistoryContainer.addView(tv)
                }

                // Education
                val eduContainer = findViewById<LinearLayout>(R.id.education_container)
                eduContainer.removeAllViews()
                profile.education?.forEach { edu ->
                    val tv = TextView(this@ProfileActivity)
                    val grad = edu.graduationDate?.substring(0, 10) ?: ""
                    tv.text = listOfNotNull(edu.name, edu.degreeName, grad).joinToString(" | ")
                    tv.setPadding(0, 8, 0, 8)
                    eduContainer.addView(tv)
                }

                // Other Registrations
                val otherRegContainer = findViewById<LinearLayout>(R.id.other_registrations_container)
                otherRegContainer.removeAllViews()
                profile.otherRegistrations?.forEach { reg ->
                    val tv = TextView(this@ProfileActivity)
                    tv.text = listOfNotNull(reg.registrationType, reg.profession, reg.province, reg.country).joinToString(", ")
                    tv.setPadding(0, 8, 0, 8)
                    otherRegContainer.addView(tv)
                }

                // Public Notices
                val noticesContainer = findViewById<LinearLayout>(R.id.public_notices_container)
                noticesContainer.removeAllViews()
                profile.publicNotices?.forEach { notice ->
                    val tv = TextView(this@ProfileActivity)
                    tv.text = notice.toString()
                    tv.setPadding(0, 8, 0, 8)
                    noticesContainer.addView(tv)
                }

                // Map Button logic (first practice location)
                val place = profile.placesOfPractice?.firstOrNull()
                currentAddress = if (place != null) {
                    listOfNotNull(place.employerName, place.businessAddress, place.city).joinToString(", ")
                } else ""
                binding.mapButton.isEnabled = currentAddress.isNotEmpty()

            } catch (e: Exception) {
                loadingOverlay.visibility = View.GONE
                Snackbar.make(binding.root, "Error loading profile", Snackbar.LENGTH_LONG).show()
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

        val bookmarkBtn = findViewById<ImageButton>(R.id.bookmark_button)

        fun updateBookmarkIcon() {
            if (profileId != null) {
                val isBookmarked = BookmarkManager.isBookmarked(this, profileId!!)
                bookmarkBtn.setImageResource(
                    if (isBookmarked) R.drawable.ic_star_filled else R.drawable.ic_star_outline
                )
            }
        }
        updateBookmarkIcon()
        bookmarkBtn.setOnClickListener {
            profileId?.let {
                BookmarkManager.toggleBookmark(this, it)
                updateBookmarkIcon()
            }
        }
    }
}
