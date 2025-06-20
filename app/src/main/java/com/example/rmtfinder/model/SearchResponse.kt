package com.example.rmtfinder.model

data class SearchResponse(
    val result: List<ResultItem>
)

data class ResultItem(
    val profileId: String,
    val firstName: String,
    val lastName: String,
    val practiceLocation: String?,
    val authorizedToPractice: Boolean = false,
    val publicRegisterAlert: Boolean = false
)
