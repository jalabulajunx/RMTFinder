# Technical Specification: CMTO API Integration

**Document Version**: 1.2  
**Date**: July 25, 2025  
**Author**: Technical Architecture Team  
**System**: RMT Finder Application - CMTO Integration Layer

## 1. Executive Summary

This document provides comprehensive technical specifications for integrating with the College of Massage Therapists of Ontario (CMTO) public API. The integration enables real-time search and retrieval of licensed Registered Massage Therapist (RMT) profiles, supporting both basic and advanced search capabilities including multi-city filtering.

### 1.1 CMTO API Overview

**Base URL**: `https://cmto.ca.thentiacloud.net`  
**API Type**: RESTful HTTP API  
**Authentication**: Public endpoints (no authentication required)  
**Data Format**: JSON  
**Rate Limiting**: Self-imposed client-side throttling  

## 2. API Endpoints Specification

### 2.1 Search Profiles Endpoint

#### 2.1.1 Basic Endpoint Structure

```
GET https://cmto.ca.thentiacloud.net/rest/public/profile/search/
```

#### 2.1.2 Complete Parameter Specification

| Parameter | Type | Required | Default | Description | Example Values |
|-----------|------|----------|---------|-------------|----------------|
| `keyword` | String | **Yes** | - | Search term (name, city, etc.) | `"Stouffville"`, `"John Smith"` |
| `skip` | Integer | No | `0` | Pagination offset | `0`, `10`, `20` |
| `take` | Integer | No | `10` | Results per page | `10`, `25`, `50` |
| `authorizedToPractice` | Integer | No | `0` | Authorization filter | `0` (all), `1` (authorized only) |
| `acupunctureAuthorized` | Integer | No | `0` | Acupuncture authorization | `0` (all), `1` (authorized only) |
| `gender` | String | No | `"all"` | Gender filter | `"all"`, `"male"`, `"female"` |
| `registrationStatus` | String | No | `"all"` | Registration status filter | `"all"`, `"active"`, `"inactive"` |
| `city` | String | No | `"all"` | **City filter (supports multiple)** | `"all"`, `"Toronto"`, `"Markham,Stouffville"` |
| `language` | String | No | `"all"` | Language filter | `"all"`, `"english"`, `"french"` |
| `sortOrder` | String | No | `"asc"` | Sort direction | `"asc"`, `"desc"` |
| `sortField` | String | No | `"lastname"` | Sort field | `"lastname"`, `"firstname"`, `"city"` |
| `_` | Long | No | - | Cache busting timestamp | `1753477279256` |

#### 2.1.3 Enhanced Multi-City Search

**Key Feature**: The CMTO API supports filtering by multiple cities using comma-separated values in the `city` parameter.

**Enhanced Search Example**:
```
https://cmto.ca.thentiacloud.net/rest/public/profile/search/?keyword=Xiuli "Lina" Yu&skip=0&take=10&authorizedToPractice=0&acupunctureAuthorized=0&gender=all&registrationStatus=all&city=Markham,Stouffville&language=all&sortOrder=asc&sortField=lastname&_=1753477279256
```

**Multi-City Business Logic**:
- Cities are separated by commas without spaces: `Markham,Stouffville`
- City names are case-sensitive and must match CMTO database entries
- Maximum recommended cities per request: 10 (to avoid URL length limits)
- Empty city filter (`"all"`) searches across all Ontario locations

#### 2.1.4 Android Retrofit Implementation

```kotlin
@GET("rest/public/profile/search/")
suspend fun searchProfiles(
    @Query("keyword") keyword: String,
    @Query("skip") skip: Int = 0,
    @Query("take") take: Int = 10,
    @Query("authorizedToPractice") authorized: Int = 0,
    @Query("acupunctureAuthorized") acupuncture: Int = 0,
    @Query("gender") gender: String = "all",
    @Query("registrationStatus") status: String = "all",
    @Query("city") city: String = "all",
    @Query("language") language: String = "all",
    @Query("sortOrder") sortOrder: String = "asc",
    @Query("sortField") sortField: String = "lastname",
    @Query("_") cacheTimestamp: Long? = null
): SearchResponse
```

#### 2.1.5 Enhanced Multi-City Search Implementation

```kotlin
// Enhanced service method for multi-city search
suspend fun searchProfilesMultipleCity(
    keyword: String,
    cities: List<String>,
    skip: Int = 0,
    take: Int = 10,
    authorizedOnly: Boolean = false,
    acupunctureAuthorized: Boolean = false,
    gender: String = "all",
    sortOrder: String = "asc"
): SearchResponse {
    val cityFilter = if (cities.isEmpty()) "all" else cities.joinToString(",")
    val cacheTimestamp = System.currentTimeMillis()
    
    return searchProfiles(
        keyword = keyword,
        skip = skip,
        take = take,
        authorized = if (authorizedOnly) 1 else 0,
        acupuncture = if (acupunctureAuthorized) 1 else 0,
        gender = gender,
        city = cityFilter,
        sortOrder = sortOrder,
        cacheTimestamp = cacheTimestamp
    )
}

// Helper function for GTA-specific searches
suspend fun searchGTAProfiles(keyword: String): SearchResponse {
    val gtaCities = listOf(
        "Toronto", "Mississauga", "Brampton", "Markham", 
        "Vaughan", "Richmond Hill", "Oakville", "Burlington",
        "Oshawa", "Whitby", "Ajax", "Pickering", "Stouffville",
        "Newmarket", "Aurora", "Georgina", "King", "Whitchurch-Stouffville"
    )
    
    return searchProfilesMultipleCity(
        keyword = keyword,
        cities = gtaCities,
        authorizedOnly = true
    )
}
```

#### 2.1.6 Response Structure

```json
{
  "result": [
    {
      "profileId": "12345",
      "firstName": "John",
      "lastName": "Smith",
      "practiceLocation": "Toronto, ON",
      "authorizedToPractice": true,
      "publicRegisterAlert": false
    }
  ]
}
```

**Response Data Model**:
```kotlin
data class SearchResponse(
    val result: List<ResultItem>
)

data class ResultItem(
    val profileId: String,        // CMTO unique identifier
    val firstName: String,        // Given name
    val lastName: String,         // Family name
    val practiceLocation: String?, // Primary practice location
    val authorizedToPractice: Boolean = false, // Current authorization status
    val publicRegisterAlert: Boolean = false  // Public notice indicator
)
```

### 2.2 Profile Detail Endpoint

#### 2.2.1 Endpoint Structure

```
GET https://cmto.ca.thentiacloud.net/rest/public/profile/get/?id={profileId}
```

#### 2.2.2 Implementation

```kotlin
@GET("rest/public/profile/get/")
suspend fun getProfile(@Query("id") id: String): ProfileResponse
```

#### 2.2.3 Comprehensive Profile Response Model

```kotlin
data class ProfileResponse(
    // Basic Information
    val id: String?,
    val firstName: String?,
    val lastName: String?,
    val middleName: String?,
    val commonName: String?,
    val gender: String?,
    val profileId: String?,
    
    // Registration Details
    val registrationNumber: String?,        // CMTO registration number
    val registrationCategory: String?,      // Registration category
    val registrationStatus: String?,        // Current status
    val initialRegistrationDate: String?,   // First registration date
    val currentEffectiveDate: String?,      // Current license effective date
    val currentExpirationDate: String?,     // License expiration date
    
    // Location & Contact
    val city: String?,
    val address1: String?,
    val address2: String?,
    val province: String?,
    val postalCode: String?,
    val country: String?,
    val phone: String?,
    val publicEmail: String?,
    val website: String?,
    val websiteURL: String?,
    
    // Professional Information
    val languagesOfCare: List<String>?,
    val areaOfPractice: List<String>?,
    val authorizedToPractice: String?,
    val authorizedEffectiveDate: String?,
    val acupunctureAuthorized: String?,
    val acupunctureEffectiveDate: String?,
    
    // Practice Locations
    val primaryPlacesOfPractice: List<PlaceOfPractice>?,
    val placesOfPractice: List<PlaceOfPractice>?,
    val currentPlacesOfPractice: List<PlaceOfPractice>?,
    
    // Historical Data
    val nameHistory: List<NameHistory>?,
    val registrationHistory: List<RegistrationHistory>?,
    val education: List<Education>?,
    val otherRegistrations: List<OtherRegistration>?,
    
    // Public Notices & Alerts
    val publicNotices: List<String>?,
    val hasPublicNotices: Boolean?,
    val noticesStatus: String?,
    val statusVisualClass: String?,
    
    // Corporate Information
    val corporationId: String?,
    val corporationName: String?,
    val corporationCity: String?,
    val corporationProvince: String?,
    val corporationCountry: String?,
    val corporationPostalCode: String?,
    val corporationStatus: String?,
    val shareholder: List<String>?
)
```

#### 2.2.4 Supporting Data Models

```kotlin
data class PlaceOfPractice(
    val id: String?,
    val name: String?,                // Clinic/practice name
    val startDate: String?,           // Employment start date
    val endDate: String?,            // Employment end date (null if current)
    val primary: Boolean?,           // Primary practice indicator
    val phone: String?,              // Practice contact number
    val email: String?,              // Practice email
    val position: String?,           // Role/position title
    val city: String?,               // Practice city
    val province: String?,           // Practice province
    val website: String?,            // Practice website
    val websiteURL: String?,         // Full website URL
    val active: Boolean?,            // Currently active
    val status: String?,             // Practice status
    val businessAddress: String?,    // Physical address
    val businessCity: String?,       // Business city
    val businessState: String?,      // Business state/province
    val businessZipCode: String?,    // Postal/ZIP code
    val organization: String?,       // Organization name
    val practiceLimitations: List<String>? // Any practice restrictions
)

data class NameHistory(
    val firstName: String?,
    val middleName: String?,
    val lastName: String?,
    val id: String?
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
    val name: String?,              // Program name
    val institutionName: String?,   // School/institution
    val degreeName: String?,        // Degree/certificate name
    val city: String?,              // Institution city
    val state: String?,             // Institution state/province
    val country: String?,           // Institution country
    val graduationDate: String?     // Graduation date
)

data class OtherRegistration(
    val id: String?,
    val registrationType: String?,  // Type of registration
    val profession: String?,        // Professional designation
    val province: String?,          // Jurisdiction
    val country: String?,           // Country
    val current: Any?              // Current status (Boolean or String)
)
```

## 3. HTTP Client Configuration

### 3.1 Retrofit Client Setup

```kotlin
object RetrofitClient {
    val api: CMTOService by lazy {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        // SSL Configuration for CMTO's certificate
        val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        })
        
        val sslContext = SSLContext.getInstance("SSL")
        sslContext.init(null, trustAllCerts, java.security.SecureRandom())
        
        val client = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
            .hostnameVerifier { _, _ -> true }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
        
        Retrofit.Builder()
            .baseUrl("https://cmto.ca.thentiacloud.net/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CMTOService::class.java)
    }
}
```

### 3.2 Network Security Configuration

**Android Manifest Configuration** (`res/xml/network_security_config.xml`):
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">cmto.ca.thentiacloud.net</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </base-config>
</network-security-config>
```

### 3.3 HTTP Request Headers

**Standard Headers**:
```kotlin
private val defaultHeaders = mapOf(
    "User-Agent" to "RMTFinder/1.0 (Android)",
    "Accept" to "application/json",
    "Accept-Language" to "en-US,en;q=0.9",
    "Accept-Encoding" to "gzip, deflate, br",
    "Connection" to "keep-alive",
    "Cache-Control" to "no-cache"
)
```

## 4. Business Logic Implementation

### 4.1 Search Service Layer

```kotlin
class CMTOSearchService {
    private val api = RetrofitClient.api
    
    suspend fun searchRMTs(
        searchTerm: String,
        cities: List<String> = emptyList(),
        pageSize: Int = 10,
        pageOffset: Int = 0,
        filters: SearchFilters = SearchFilters()
    ): SearchResult {
        
        // Input validation
        require(searchTerm.isNotBlank()) { "Search term cannot be empty" }
        require(pageSize in 1..100) { "Page size must be between 1 and 100" }
        require(pageOffset >= 0) { "Page offset must be non-negative" }
        
        val cityFilter = when {
            cities.isEmpty() -> "all"
            cities.size == 1 -> cities.first()
            else -> cities.joinToString(",")
        }
        
        try {
            val response = api.searchProfiles(
                keyword = searchTerm.trim(),
                skip = pageOffset,
                take = pageSize,
                authorized = if (filters.authorizedOnly) 1 else 0,
                acupuncture = if (filters.acupunctureAuthorized) 1 else 0,
                gender = filters.gender,
                status = filters.registrationStatus,
                city = cityFilter,
                language = filters.language,
                sortOrder = filters.sortOrder,
                sortField = filters.sortField,
                cacheTimestamp = System.currentTimeMillis()
            )
            
            return SearchResult.Success(
                results = response.result,
                totalCount = response.result.size,
                hasMore = response.result.size == pageSize
            )
            
        } catch (e: Exception) {
            return SearchResult.Error(
                message = "Search failed: ${e.message}",
                exception = e
            )
        }
    }
    
    suspend fun getDetailedProfile(profileId: String): ProfileResult {
        require(profileId.isNotBlank()) { "Profile ID cannot be empty" }
        
        return try {
            val profile = api.getProfile(profileId)
            ProfileResult.Success(profile)
        } catch (e: Exception) {
            ProfileResult.Error("Failed to load profile: ${e.message}", e)
        }
    }
}

data class SearchFilters(
    val authorizedOnly: Boolean = true,
    val acupunctureAuthorized: Boolean = false,
    val gender: String = "all",
    val registrationStatus: String = "all",
    val language: String = "all",
    val sortOrder: String = "asc",
    val sortField: String = "lastname"
)

sealed class SearchResult {
    data class Success(
        val results: List<ResultItem>,
        val totalCount: Int,
        val hasMore: Boolean
    ) : SearchResult()
    
    data class Error(
        val message: String,
        val exception: Exception
    ) : SearchResult()
}

sealed class ProfileResult {
    data class Success(val profile: ProfileResponse) : ProfileResult()
    data class Error(val message: String, val exception: Exception) : ProfileResult()
}
```

### 4.2 ViewModel Integration

```kotlin
class MainViewModel : ViewModel() {
    private val searchService = CMTOSearchService()
    
    private val _searchResults = MutableLiveData<List<ResultItem>>()
    val searchResults: LiveData<List<ResultItem>> = _searchResults
    
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading
    
    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error
    
    private var currentQuery: String = ""
    private var currentCities: List<String> = emptyList()
    private var currentPage = 0
    private var isLoadingInternal = false
    
    fun searchRMTs(
        query: String, 
        cities: List<String> = emptyList(),
        append: Boolean = false
    ) {
        if (isLoadingInternal) return
        
        viewModelScope.launch {
            isLoadingInternal = true
            _isLoading.value = true
            _error.value = null
            
            if (!append) {
                currentQuery = query
                currentCities = cities
                currentPage = 0
                _searchResults.value = emptyList()
            }
            
            when (val result = searchService.searchRMTs(
                searchTerm = currentQuery,
                cities = currentCities,
                pageOffset = currentPage * 10,
                pageSize = 10
            )) {
                is SearchResult.Success -> {
                    val newResults = if (append) {
                        (_searchResults.value ?: emptyList()) + result.results
                    } else {
                        result.results
                    }
                    _searchResults.value = newResults
                    currentPage++
                    
                    if (newResults.isEmpty() && !append) {
                        _error.value = "No RMTs found for '$currentQuery'"
                    }
                }
                is SearchResult.Error -> {
                    _error.value = result.message
                    if (!append) _searchResults.value = emptyList()
                }
            }
            
            isLoadingInternal = false
            _isLoading.value = false
        }
    }
    
    fun searchNearbyRMTs(query: String) {
        // Predefined list of GTA municipalities for "nearby" search
        val gtaRegion = listOf(
            "Toronto", "Mississauga", "Brampton", "Hamilton",
            "Markham", "Vaughan", "Kitchener", "Windsor",
            "Richmond Hill", "Oakville", "Burlington", "Oshawa",
            "Barrie", "Sudbury", "Kingston", "Guelph"
        )
        searchRMTs(query, gtaRegion)
    }
    
    fun loadNextPage() {
        searchRMTs(currentQuery, currentCities, append = true)
    }
}
```

## 5. Advanced Search Features

### 5.1 Geographic Search Capabilities

```kotlin
object RegionalSearchHelper {
    
    // Ontario regional city groupings
    val GREATER_TORONTO_AREA = listOf(
        "Toronto", "Mississauga", "Brampton", "Markham", "Vaughan",
        "Richmond Hill", "Oakville", "Burlington", "Oshawa", "Whitby",
        "Ajax", "Pickering", "Stouffville", "Newmarket", "Aurora"
    )
    
    val SOUTHWESTERN_ONTARIO = listOf(
        "London", "Windsor", "Hamilton", "Kitchener", "Waterloo",
        "Cambridge", "Guelph", "Brantford", "Sarnia", "Chatham-Kent"
    )
    
    val EASTERN_ONTARIO = listOf(
        "Ottawa", "Kingston", "Cornwall", "Pembroke", "Petawawa",
        "Belleville", "Quinte West", "Brockville", "Smiths Falls"
    )
    
    val NORTHERN_ONTARIO = listOf(
        "Sudbury", "Thunder Bay", "Sault Ste. Marie", "North Bay",
        "Timmins", "Kenora", "Dryden", "Elliot Lake"
    )
    
    val CENTRAL_ONTARIO = listOf(
        "Barrie", "Orillia", "Midland", "Collingwood", "Owen Sound",
        "Huntsville", "Gravenhurst", "Bracebridge", "Parry Sound"
    )
    
    fun searchByRegion(region: String, keyword: String): List<String> {
        return when (region.lowercase()) {
            "gta", "greater toronto area" -> GREATER_TORONTO_AREA
            "southwestern", "southwest" -> SOUTHWESTERN_ONTARIO
            "eastern", "east" -> EASTERN_ONTARIO
            "northern", "north" -> NORTHERN_ONTARIO
            "central" -> CENTRAL_ONTARIO
            else -> emptyList()
        }
    }
    
    // Distance-based city selection (simplified)
    fun getNearbyCity(centerCity: String, radiusKm: Int = 50): List<String> {
        // This would integrate with a geographic service
        // For now, return predefined nearby cities
        return when (centerCity.lowercase()) {
            "toronto" -> GREATER_TORONTO_AREA
            "ottawa" -> listOf("Ottawa", "Kanata", "Nepean", "Gloucester", "Orleans")
            "london" -> listOf("London", "St. Thomas", "Strathroy", "Woodstock")
            else -> listOf(centerCity)
        }
    }
}
```

### 5.2 Smart Search Enhancement

```kotlin
class SmartSearchEngine {
    
    // Autocomplete and suggestion engine
    suspend fun getSearchSuggestions(input: String): List<SearchSuggestion> {
        val suggestions = mutableListOf<SearchSuggestion>()
        
        // City suggestions
        val citySuggestions = OntarioCities.searchCities(input)
        suggestions.addAll(citySuggestions.map { 
            SearchSuggestion(it, SearchType.CITY) 
        })
        
        // Name suggestions (would typically come from a local cache)
        if (input.length >= 2) {
            suggestions.add(SearchSuggestion("Search for '$input' (Name)", SearchType.NAME))
        }
        
        return suggestions.take(10)
    }
    
    // Search query analysis and optimization
    fun analyzeSearchQuery(query: String): SearchQueryAnalysis {
        val tokens = query.trim().split("\\s+".toRegex())
        
        val possibleCities = tokens.filter { token ->
            OntarioCities.isValidCity(token)
        }
        
        val possibleNames = tokens.filter { token ->
            token.length >= 2 && !OntarioCities.isValidCity(token)
        }
        
        return SearchQueryAnalysis(
            originalQuery = query,
            detectedCities = possibleCities,
            nameTokens = possibleNames,
            searchStrategy = if (possibleCities.isNotEmpty()) 
                SearchStrategy.CITY_FOCUSED else SearchStrategy.NAME_FOCUSED
        )
    }
}

data class SearchSuggestion(
    val text: String,
    val type: SearchType
)

enum class SearchType {
    CITY, NAME, SPECIALTY, REGION
}

data class SearchQueryAnalysis(
    val originalQuery: String,
    val detectedCities: List<String>,
    val nameTokens: List<String>,
    val searchStrategy: SearchStrategy
)

enum class SearchStrategy {
    CITY_FOCUSED, NAME_FOCUSED, MIXED
}
```

## 6. Error Handling & Resilience

### 6.1 Comprehensive Error Management

```kotlin
sealed class CMTOApiError(message: String, cause: Throwable? = null) : Exception(message, cause) {
    object NetworkError : CMTOApiError("Network connection failed")
    object TimeoutError : CMTOApiError("Request timed out")
    object ServerError : CMTOApiError("CMTO server error")
    object InvalidResponse : CMTOApiError("Invalid response format")
    data class HttpError(val code: Int, val body: String?) : CMTOApiError("HTTP error: $code")
    data class UnknownError(val originalException: Exception) : CMTOApiError("Unknown error", originalException)
}

class ErrorHandler {
    fun handleApiError(exception: Exception): CMTOApiError {
        return when (exception) {
            is UnknownHostException, is ConnectException -> CMTOApiError.NetworkError
            is SocketTimeoutException -> CMTOApiError.TimeoutError
            is HttpException -> CMTOApiError.HttpError(exception.code(), exception.message())
            is JsonSyntaxException, is JsonParseException -> CMTOApiError.InvalidResponse
            else -> CMTOApiError.UnknownError(exception)
        }
    }
    
    fun getErrorMessage(error: CMTOApiError): String {
        return when (error) {
            is CMTOApiError.NetworkError -> "Please check your internet connection and try again"
            is CMTOApiError.TimeoutError -> "Request took too long. Please try again"
            is CMTOApiError.ServerError -> "CMTO service is temporarily unavailable"
            is CMTOApiError.InvalidResponse -> "Received invalid data from CMTO"
            is CMTOApiError.HttpError -> when (error.code) {
                404 -> "No results found"
                429 -> "Too many requests. Please wait and try again"
                500, 502, 503 -> "CMTO service is temporarily unavailable"
                else -> "Service error (${error.code})"
            }
            is CMTOApiError.UnknownError -> "An unexpected error occurred"
        }
    }
}
```

### 6.2 Retry Logic and Circuit Breaker

```kotlin
class ResilienceManager {
    private var failureCount = 0
    private var lastFailureTime = 0L
    private val maxFailures = 3
    private val resetTimeoutMs = 60_000L // 1 minute
    
    suspend fun <T> executeWithResilience(operation: suspend () -> T): T {
        if (isCircuitOpen()) {
            throw CMTOApiError.ServerError
        }
        
        return try {
            val result = withRetry { operation() }
            onSuccess()
            result
        } catch (e: Exception) {
            onFailure()
            throw e
        }
    }
    
    private suspend fun <T> withRetry(
        maxAttempts: Int = 3,
        delayMs: Long = 1000L,
        operation: suspend () -> T
    ): T {
        repeat(maxAttempts - 1) { attempt ->
            try {
                return operation()
            } catch (e: Exception) {
                delay(delayMs * (attempt + 1)) // Exponential backoff
            }
        }
        return operation() // Final attempt
    }
    
    private fun isCircuitOpen(): Boolean {
        return failureCount >= maxFailures && 
               (System.currentTimeMillis() - lastFailureTime) < resetTimeoutMs
    }
    
    private fun onSuccess() {
        failureCount = 0
    }
    
    private fun onFailure() {
        failureCount++
        lastFailureTime = System.currentTimeMillis()
    }
}
```

## 7. Performance Optimization

### 7.1 Caching Strategy

```kotlin
class CMTOCacheManager {
    private val searchCache = LruCache<String, CacheEntry<SearchResponse>>(50)
    private val profileCache = LruCache<String, CacheEntry<ProfileResponse>>(100)
    private val cacheValidityMs = 5 * 60 * 1000L // 5 minutes
    
    fun getCachedSearch(key: String): SearchResponse? {
        val entry = searchCache.get(key)
        return if (entry?.isValid() == true) entry.data else null
    }
    
    fun cacheSearchResult(key: String, result: SearchResponse) {
        searchCache.put(key, CacheEntry(result, System.currentTimeMillis()))
    }
    
    fun getCachedProfile(profileId: String): ProfileResponse? {
        val entry = profileCache.get(profileId)
        return if (entry?.isValid() == true) entry.data else null
    }
    
    fun cacheProfile(profileId: String, profile: ProfileResponse) {
        profileCache.put(profileId, CacheEntry(profile, System.currentTimeMillis()))
    }
    
    private fun generateSearchKey(
        keyword: String, 
        cities: List<String>, 
        filters: SearchFilters
    ): String {
        return "$keyword|${cities.joinToString(",")}|${filters.hashCode()}"
    }
    
    data class CacheEntry<T>(
        val data: T,
        val timestamp: Long
    ) {
        fun isValid(): Boolean = 
            (System.currentTimeMillis() - timestamp) < 5 * 60 * 1000L
    }
}
```

### 7.2 Request Optimization

```kotlin
class RequestOptimizer {
    
    // Batch multiple city searches into single request
    fun optimizeCitySearch(cities: List<String>): List<String> {
        return cities.distinct()
            .filter { it.isNotBlank() }
            .take(10) // Limit to prevent URL length issues
    }
    
    // Optimize pagination parameters
    fun optimizePagination(pageSize: Int, currentResults: Int): Int {
        return when {
            currentResults < 50 -> minOf(pageSize, 25)
            currentResults < 200 -> minOf(pageSize, 20)
            else -> minOf(pageSize, 15)
        }
    }
    
    // Request deduplication
    private val ongoingRequests = mutableMapOf<String, Deferred<SearchResponse>>()
    
    suspend fun deduplicatedSearch(
        searchKey: String,
        searchOperation: suspend () -> SearchResponse
    ): SearchResponse {
        
        return ongoingRequests[searchKey]?.await() ?: run {
            val deferred = CoroutineScope(Dispatchers.IO).async {
                searchOperation()
            }
            ongoingRequests[searchKey] = deferred
            
            try {
                deferred.await()
            } finally {
                ongoingRequests.remove(searchKey)
            }
        }
    }
}
```

## 8. Integration Best Practices

### 8.1 API Usage Guidelines

1. **Rate Limiting**: Self-impose 2-second delays between requests
2. **Cache Busting**: Use timestamp parameter for fresh data when needed
3. **Error Recovery**: Implement exponential backoff for failed requests
4. **Resource Cleanup**: Properly dispose of HTTP connections
5. **Logging**: Log API calls for debugging and monitoring

### 8.2 Data Validation

```kotlin
class DataValidator {
    
    fun validateSearchResponse(response: SearchResponse): ValidationResult {
        val errors = mutableListOf<String>()
        
        response.result.forEach { item ->
            if (item.profileId.isBlank()) {
                errors.add("Missing profile ID for ${item.firstName} ${item.lastName}")
            }
            if (item.firstName.isBlank() && item.lastName.isBlank()) {
                errors.add("Missing name for profile ${item.profileId}")
            }
        }
        
        return if (errors.isEmpty()) {
            ValidationResult.Valid
        } else {
            ValidationResult.Invalid(errors)
        }
    }
    
    fun validateProfileResponse(profile: ProfileResponse): ValidationResult {
        val errors = mutableListOf<String>()
        
        if (profile.id.isNullOrBlank()) {
            errors.add("Missing profile ID")
        }
        if (profile.registrationNumber.isNullOrBlank()) {
            errors.add("Missing registration number")
        }
        
        return if (errors.isEmpty()) {
            ValidationResult.Valid
        } else {
            ValidationResult.Invalid(errors)
        }
    }
}

sealed class ValidationResult {
    object Valid : ValidationResult()
    data class Invalid(val errors: List<String>) : ValidationResult()
}
```

## 9. Security Considerations

### 9.1 Data Protection

- **Minimal Data Storage**: Cache only essential data, expire regularly
- **Input Sanitization**: Validate all user inputs before API calls
- **SSL/TLS**: Enforce secure connections to CMTO endpoints
- **Privacy Compliance**: Respect CMTO terms of service and Ontario privacy laws

### 9.2 API Security

```kotlin
class SecurityManager {
    
    fun sanitizeSearchInput(input: String): String {
        return input.trim()
            .replace(Regex("[<>\"'&]"), "") // Remove potentially dangerous characters
            .take(100) // Limit input length
    }
    
    fun validateCity(city: String): Boolean {
        return OntarioCities.isValidCity(city) && 
               city.matches(Regex("[a-zA-Z\\s\\-']+")) // Only allow letters, spaces, hyphens, apostrophes
    }
    
    fun logAPICall(endpoint: String, parameters: Map<String, Any>) {
        // Log for monitoring and debugging, but exclude sensitive data
        val sanitizedParams = parameters.filterKeys { 
            it !in listOf("profileId", "personalInfo") 
        }
        Log.d("CMTOApi", "Called $endpoint with params: $sanitizedParams")
    }
}
```

---

**Document Control**  
- **Version**: 1.2  
- **Last Updated**: July 25, 2025  
- **Review Cycle**: Quarterly  
- **Distribution**: Development Team, QA Team, Product Management  
- **Approval**: Technical Lead, Privacy Officer