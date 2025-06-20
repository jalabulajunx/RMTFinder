package com.example.rmtfinder.model

data class ProfileResponse(
    val id: String?,
    val firstName: String?,
    val lastName: String?,
    val middleName: String?,
    val commonName: String?,
    val gender: String?,
    val commonFirstName: String?,
    val commonLastName: String?,
    val profileId: String?,
    val registrationNumber: String?,
    val registrationCategory: String?,
    val registrationStatus: String?,
    val initialRegistrationDate: String?,
    val currentEffectiveDate: String?,
    val currentExpirationDate: String?,
    val city: String?,
    val publicEmail: String?,
    val language: String?,
    val email: String?,
    val electoralZone: String?,
    val previousNames: List<NameHistory>?,
    val primaryPlacesOfPractice: List<PlaceOfPractice>?,
    val placesOfPractice: List<PlaceOfPractice>?,
    val currentPlacesOfPractice: List<PlaceOfPractice>?,
    val languagesOfCare: List<String>?,
    val areaOfPractice: List<String>?,
    val otherRegistrations: List<OtherRegistration>?,
    val registrationHistory: List<RegistrationHistory>?,
    val education: List<Education>?,
    val publicNotices: List<String>?,
    val address1: String?,
    val address2: String?,
    val province: String?,
    val postalCode: String?,
    val country: String?,
    val phone: String?,
    val setPracticeLocation: String?,
    val authorizedToPractice: String?,
    val authorizedEffectiveDate: String?,
    val hideLocationFromRegister: String?,
    val corporationId: String?,
    val corporationName: String?,
    val corporationCity: String?,
    val corporationProvince: String?,
    val corporationCountry: String?,
    val corporationPostalCode: String?,
    val corporationStatus: String?,
    val shareholder: List<String>?,
    val website: String?,
    val websiteURL: String?,
    val hasPublicNotices: Boolean?,
    val statusVisualClass: String?,
    val noticesStatus: String?,
    val faxNumber: String?,
    val nameHistory: List<NameHistory>?,
    val acupunctureAuthorized: String?,
    val acupunctureEffectiveDate: String?
)

data class PlaceOfPractice(
    val id: String?,
    val name: String?,
    val startDate: String?,
    val endDate: String?,
    val primary: Boolean?,
    val registrant: String?,
    val phone: String?,
    val position: String?,
    val email: String?,
    val city: String?,
    val province: String?,
    val website: String?,
    val websiteURL: String?,
    val active: Boolean?,
    val status: String?,
    val employerName: String?,
    val businessAddress: String?,
    val businessCity: String?,
    val businessState: String?,
    val businessZipCode: String?,
    val organization: String?,
    val practiceLimitations: List<String>?
)

data class NameHistory(
    val firstName: String?,
    val middleName: String?,
    val lastName: String?,
    val id: String?
)

data class OtherRegistration(
    val id: String?,
    val registrationType: String?,
    val profession: String?,
    val province: String?,
    val country: String?,
    val current: Any?
)

data class RegistrationHistory(
    val id: String?,
    val classOfRegistration: String?,
    val registrationStatus: String?,
    val effectiveDate: String?,
    val expiryDate: String?,
    val notes: String?
)

data class Education(
    val id: String?,
    val name: String?,
    val institutionName: String?,
    val degreeName: String?,
    val city: String?,
    val state: String?,
    val country: String?,
    val graduationDate: String?
)
