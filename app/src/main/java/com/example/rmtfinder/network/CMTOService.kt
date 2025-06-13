package com.example.rmtfinder.network

import com.example.rmtfinder.model.ProfileResponse
import com.example.rmtfinder.model.SearchResponse
import retrofit2.http.GET
import retrofit2.http.Query

interface CMTOService {
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
        @Query("sortField") sortField: String = "lastname"
    ): SearchResponse

    @GET("rest/public/profile/get/")
    suspend fun getProfile(@Query("id") id: String): ProfileResponse
}
