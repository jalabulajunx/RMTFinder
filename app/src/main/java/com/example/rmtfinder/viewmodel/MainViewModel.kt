package com.example.rmtfinder.viewmodel

import android.util.Log
import androidx.lifecycle.*
import com.example.rmtfinder.model.ResultItem
import com.example.rmtfinder.network.RetrofitClient
import kotlinx.coroutines.launch

class MainViewModel : ViewModel() {
    private val _results = MutableLiveData<List<ResultItem>>()
    val results: LiveData<List<ResultItem>> = _results

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private var currentQuery: String = ""
    private var currentPage = 0
    private var _isLoadingInternal = false
    private val pageSize = 10

    fun search(keyword: String, append: Boolean = false) {
        if (_isLoadingInternal) return
        
        Log.d("MainViewModel", "Searching for: $keyword")
        
        _isLoadingInternal = true
        _isLoading.value = true
        _error.value = null
        
        if (!append) {
            currentPage = 0
            currentQuery = keyword
        }

        viewModelScope.launch {
            try {
                Log.d("MainViewModel", "Making API call to search profiles")
                val response = RetrofitClient.api.searchProfiles(
                    keyword = currentQuery,
                    skip = currentPage * pageSize,
                    take = pageSize
                )
                
                Log.d("MainViewModel", "API response received: ${response.result.size} results")
                
                val newList = if (append) (_results.value ?: emptyList()) + response.result
                              else response.result
                _results.value = newList
                currentPage++
                
                if (newList.isEmpty() && !append) {
                    _error.value = "No results found for '$keyword'"
                }
                
            } catch (e: Exception) {
                Log.e("MainViewModel", "Search failed", e)
                _error.value = "Search failed: ${e.message}"
                if (!append) _results.value = emptyList()
            } finally {
                _isLoadingInternal = false
                _isLoading.value = false
            }
        }
    }

    fun loadNextPage() {
        search(currentQuery, append = true)
    }

    fun clearError() {
        _error.value = null
    }
}
