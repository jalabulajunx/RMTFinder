package com.example.rmtfinder.network

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    val api: CMTOService by lazy {
        Retrofit.Builder()
            .baseUrl("https://cmto.ca.thentiacloud.net/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CMTOService::class.java)
    }
}
