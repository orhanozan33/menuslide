package com.digitalsignage.tv

import android.annotation.SuppressLint
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var reloadHandler: android.os.Handler? = null
    private var connectionCheckHandler: android.os.Handler? = null

    // TODO: Configure this URL with your screen's public token
    // Format: https://your-domain.com/display/{public_token}
    private val DISPLAY_URL = "https://your-domain.com/display/YOUR_PUBLIC_TOKEN_HERE"

    // Auto-reload interval (5 minutes)
    private val RELOAD_INTERVAL = 5 * 60 * 1000L

    // Connection check interval (30 seconds)
    private val CONNECTION_CHECK_INTERVAL = 30 * 1000L

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Fullscreen mode
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        // Keep screen on
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Initialize WebView
        webView = WebView(this)
        setContentView(webView)

        // Configure WebView settings
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
        }

        // Set WebView client
        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // Show error and attempt reload
                showError("Connection error. Retrying...")
                reloadPage()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Page loaded successfully
                hideError()
            }
        }

        // Set Chrome client for fullscreen support
        webView.webChromeClient = WebChromeClient()

        // Load the display URL
        loadDisplayUrl()

        // Setup auto-reload
        setupAutoReload()

        // Setup connection monitoring
        setupConnectionMonitoring()
    }

    private fun loadDisplayUrl() {
        if (DISPLAY_URL.contains("YOUR_PUBLIC_TOKEN_HERE")) {
            showError("Please configure DISPLAY_URL in MainActivity.kt")
            return
        }
        webView.loadUrl(DISPLAY_URL)
    }

    private fun reloadPage() {
        if (isNetworkAvailable()) {
            webView.reload()
        } else {
            showError("No internet connection")
        }
    }

    private fun setupAutoReload() {
        reloadHandler = android.os.Handler(android.os.Looper.getMainLooper())
        reloadHandler?.postDelayed(object : Runnable {
            override fun run() {
                reloadPage()
                reloadHandler?.postDelayed(this, RELOAD_INTERVAL)
            }
        }, RELOAD_INTERVAL)
    }

    private fun setupConnectionMonitoring() {
        connectionCheckHandler = android.os.Handler(android.os.Looper.getMainLooper())
        connectionCheckHandler?.postDelayed(object : Runnable {
            override fun run() {
                if (!isNetworkAvailable()) {
                    showError("No internet connection")
                } else {
                    hideError()
                    // If page seems stuck, reload
                    if (webView.progress < 100) {
                        reloadPage()
                    }
                }
                connectionCheckHandler?.postDelayed(this, CONNECTION_CHECK_INTERVAL)
            }
        }, CONNECTION_CHECK_INTERVAL)
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun showError(message: String) {
        // In a production app, you might want to show a custom error overlay
        // For now, we'll just log it
        android.util.Log.e("MainActivity", message)
    }

    private fun hideError() {
        // Hide error overlay if shown
    }

    override fun onBackPressed() {
        // Prevent back button from closing app in fullscreen mode
        // Optionally, you can exit fullscreen or show a menu
        super.onBackPressed()
    }

    override fun onDestroy() {
        super.onDestroy()
        reloadHandler?.removeCallbacksAndMessages(null)
        connectionCheckHandler?.removeCallbacksAndMessages(null)
        webView.destroy()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        // Reload if connection is available
        if (isNetworkAvailable()) {
            reloadPage()
        }
    }
}
