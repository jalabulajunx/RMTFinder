package com.example.rmtfinder.viewmodel

import androidx.lifecycle.*
import com.example.rmtfinder.model.ResultItem
import com.example.rmtfinder.network.RetrofitClient
import kotlinx.coroutines.launch

class MainViewModel : ViewModel() {
    private val _results = MutableLiveData<List<ResultItem>>()
    val results: LiveData<List<ResultItem>> = _results

    private var currentQuery: String = ""
    private var currentPage = 0
    private var isLoading = false
    private val pageSize = 10

    fun search(keyword: String, append: Boolean = false) {
        if (isLoading) return
        isLoading = true
        if (!append) {
            currentPage = 0
            currentQuery = keyword
        }

        viewModelScope.launch {
            try {
                val response = RetrofitClient.api.searchProfiles(
                    keyword = currentQuery,
                    skip = currentPage * pageSize,
                    take = pageSize
                )
                val newList = if (append) (_results.value ?: emptyList()) + response.result
                              else response.result
                _results.value = newList
                currentPage++
            } catch (e: Exception) {
                if (!append) _results.value = emptyList()
            } finally {
                isLoading = false
            }
        }
    }

    fun loadNextPage() {
        search(currentQuery, append = true)
    }
}
