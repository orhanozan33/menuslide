package com.digitalsignage.tv.activation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.digitalsignage.tv.data.api.RegisterResponse
import com.digitalsignage.tv.data.repository.DeviceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class ActivationViewModel @Inject constructor(
    private val repository: DeviceRepository
) : ViewModel() {

    fun activate(displayCode: String, onResult: (Result<RegisterResponse>) -> Unit) {
        viewModelScope.launch {
            val result = repository.register(displayCode)
            withContext(Dispatchers.Main) { onResult(result) }
        }
    }
}
