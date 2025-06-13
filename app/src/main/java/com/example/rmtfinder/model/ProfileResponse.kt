package com.example.rmtfinder.model

data class ProfileResponse(
    val firstName: String,
    val lastName: String,
    val registrationStatus: String,
    val registrationCategory: String,
    val placesOfPractice: List<PlaceOfPractice>,
    val languagesOfCare: List<String>
)

data class PlaceOfPractice(
    val employerName: String?,
    val businessAddress: String?,
    val city: String?,
    val phone: String?
)
