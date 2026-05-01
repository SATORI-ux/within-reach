package com.satori.withinreach

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activeActivity = this
        createNotificationChannels(this)
        requestNotificationPermission()

        webView = WebView(this)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val target = request.url.toString()
                if (safeWithinReachUrl(target) != null) return false

                startActivity(Intent(Intent.ACTION_VIEW, request.url))
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                emitTokenToWeb()
            }
        }
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.addJavascriptInterface(AndroidBridge(this), "WithinReachAndroid")
        setContentView(webView)

        refreshFcmToken()
        webView.loadUrl(resolveLaunchUrl(intent))
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        webView.loadUrl(resolveLaunchUrl(intent))
    }

    override fun onDestroy() {
        if (activeActivity === this) {
            activeActivity = null
        }
        super.onDestroy()
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return

        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED

        if (!granted) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun refreshFcmToken() {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            saveToken(this, token)
            emitTokenToWeb()
        }
    }

    private fun emitTokenToWeb() {
        val token = getSavedToken(this)
        if (token.isBlank() || !::webView.isInitialized) return

        val script =
            "window.dispatchEvent(new CustomEvent('withinreach:fcm-token',{detail:{token:${JSONObject.quote(token)}}}));"
        webView.post {
            webView.evaluateJavascript(script, null)
        }
    }

    private fun resolveLaunchUrl(intent: Intent?): String {
        val extraUrl = intent?.getStringExtra(EXTRA_URL)
        val dataUrl = intent?.data?.toString()
        return safeWithinReachUrl(extraUrl ?: dataUrl) ?: BuildConfig.WITHIN_REACH_APP_URL
    }

    private fun safeWithinReachUrl(candidate: String?): String? {
        if (candidate.isNullOrBlank()) return null

        val base = Uri.parse(BuildConfig.WITHIN_REACH_APP_URL)
        val url = Uri.parse(candidate)
        val sameHost = url.scheme == "https" && url.host == base.host
        return if (sameHost) url.toString() else null
    }

    class AndroidBridge(private val activity: MainActivity) {
        @JavascriptInterface
        fun getFcmToken(): String = getSavedToken(activity)

        @JavascriptInterface
        fun requestNotifications() {
            activity.runOnUiThread {
                activity.requestNotificationPermission()
            }
        }
    }

    companion object {
        const val EXTRA_URL = "within_reach_url"
        private const val PREFS_NAME = "within_reach_android"
        private const val FCM_TOKEN_KEY = "fcm_token"

        var activeActivity: MainActivity? = null

        fun saveToken(context: Context, token: String) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(FCM_TOKEN_KEY, token)
                .apply()
        }

        fun getSavedToken(context: Context): String {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(FCM_TOKEN_KEY, "")
                .orEmpty()
        }

        fun notifyTokenChanged() {
            activeActivity?.runOnUiThread {
                activeActivity?.emitTokenToWeb()
            }
        }

        fun createNotificationChannels(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val gentle = NotificationChannel(
                "gentle",
                context.getString(R.string.gentle_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = context.getString(R.string.gentle_channel_description)
                setShowBadge(false)
            }
            val urgent = NotificationChannel(
                "urgent",
                context.getString(R.string.urgent_channel_name),
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = context.getString(R.string.urgent_channel_description)
                setShowBadge(true)
            }

            notificationManager.createNotificationChannels(listOf(gentle, urgent))
        }
    }
}
