package com.digitalsignage.tv.activation

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.digitalsignage.tv.BuildConfig
import com.digitalsignage.tv.MainActivity
import com.digitalsignage.tv.R
import com.digitalsignage.tv.data.repository.DeviceRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject

@AndroidEntryPoint
class ActivationActivity : AppCompatActivity() {

    @Inject lateinit var repository: DeviceRepository

    private val viewModel: ActivationViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            if (repository.getDeviceToken() != null) {
                startActivity(Intent(this, MainActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK })
                finish()
                return
            }
        } catch (_: Throwable) { }
        try {
            setContentView(R.layout.activity_activation)
        } catch (e: Throwable) {
            android.util.Log.e("Activation", "setContentView failed", e)
            throw e
        }
        try {
            findViewById<TextView>(R.id.text_version)?.text = getString(R.string.version_label, BuildConfig.VERSION_NAME ?: "1.0")
        } catch (_: Throwable) { }

        checkForUpdate()

        val inputCode = findViewById<EditText>(R.id.input_code)
        val btnActivate = findViewById<Button>(R.id.btn_activate)
        val labelError = findViewById<TextView>(R.id.label_error)
        val progress = findViewById<ProgressBar>(R.id.progress)

        btnActivate.setOnClickListener {
            val code = inputCode.text?.toString()?.trim().orEmpty()
            if (code.isEmpty()) {
                labelError.text = getString(R.string.hint_code)
                labelError.visibility = View.VISIBLE
                return@setOnClickListener
            }
            labelError.visibility = View.GONE
            progress.visibility = View.VISIBLE
            btnActivate.isEnabled = false
            viewModel.activate(code) { result ->
                progress.visibility = View.GONE
                btnActivate.isEnabled = true
                result.onSuccess {
                    startActivity(Intent(this, MainActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK })
                    finish()
                }.onFailure {
                    labelError.text = it.message ?: "Activation failed"
                    labelError.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun checkForUpdate() {
        lifecycleScope.launch {
            val config = withContext(Dispatchers.IO) { repository.getTvAppConfig() } ?: return@launch
            val currentCode = BuildConfig.VERSION_CODE
            val minRequired = config.minVersionCode
            val latestAvailable = config.latestVersionCode

            val isRequired = minRequired != null && currentCode < minRequired
            val isOptional = latestAvailable != null && currentCode < latestAvailable && !isRequired

            if (isRequired || isOptional) {
                val downloadUrl = buildDownloadUrl(config.apiBaseUrl, config.downloadUrl)
                withContext(Dispatchers.Main) {
                    showUpdateDialog(
                        required = isRequired,
                        downloadUrl = downloadUrl
                    )
                }
            }
        }
    }

    private fun buildDownloadUrl(apiBaseUrl: String?, downloadUrl: String?): String {
        val url = downloadUrl?.trim() ?: return ""
        if (url.startsWith("http://") || url.startsWith("https://")) return url
        val base = (apiBaseUrl ?: "https://menuslide.com").trimEnd('/')
        return if (url.startsWith("/")) base + url else "$base/$url"
    }

    private fun showUpdateDialog(required: Boolean, downloadUrl: String) {
        val title = if (required) getString(R.string.update_required_title) else getString(R.string.update_available_title)
        val message = if (required) getString(R.string.update_required_message) else getString(R.string.update_available_message)
        val builder = AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton(getString(R.string.btn_update)) { _, _ ->
                openDownloadUrl(downloadUrl)
                if (required) finish()
            }
        if (!required) {
            builder.setNegativeButton(getString(R.string.btn_skip), null)
        } else {
            builder.setCancelable(false)
        }
        builder.show()
    }

    private fun openDownloadUrl(url: String) {
        if (url.isEmpty()) return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) { }
    }
}
