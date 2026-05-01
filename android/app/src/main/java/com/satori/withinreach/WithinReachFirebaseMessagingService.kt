package com.satori.withinreach

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlin.math.abs

class WithinReachFirebaseMessagingService : FirebaseMessagingService() {
    override fun onCreate() {
        super.onCreate()
        MainActivity.createNotificationChannels(this)
    }

    override fun onNewToken(token: String) {
        MainActivity.saveToken(this, token)
        MainActivity.notifyTokenChanged()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val title = data["title"] ?: getString(R.string.app_name)
        val body = data["body"] ?: ""
        val kind = data["kind"] ?: "gentle"
        val channelId = data["channel_id"] ?: if (kind == "urgent") "urgent" else "gentle"
        val url = data["url"] ?: BuildConfig.WITHIN_REACH_APP_URL
        val accentColor = parseColor(data["accent_color"])

        showNotification(
            title = title,
            body = body,
            channelId = channelId,
            url = url,
            accentColor = accentColor,
            highPriority = kind == "urgent",
        )
    }

    private fun parseColor(value: String?): Int {
        return try {
            if (value.isNullOrBlank()) {
                ContextCompat.getColor(this, R.color.notification_accent)
            } else {
                Color.parseColor(value)
            }
        } catch (_: IllegalArgumentException) {
            ContextCompat.getColor(this, R.color.notification_accent)
        }
    }

    private fun showNotification(
        title: String,
        body: String,
        channelId: String,
        url: String,
        accentColor: Int,
        highPriority: Boolean,
    ) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(MainActivity.EXTRA_URL, url)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            abs(url.hashCode()),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(accentColor)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(if (highPriority) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_STATUS)

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (NotificationManagerCompat.from(this).areNotificationsEnabled()) {
            manager.notify(abs(url.hashCode()), builder.build())
        }
    }
}
