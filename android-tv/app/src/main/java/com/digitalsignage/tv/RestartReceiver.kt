package com.digitalsignage.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * AlarmManager ile periyodik tetiklenir. Uygulama sistem tarafından kapatıldıysa ve kullanıcı
 * çıkış yapmadıysa MainActivity'yi tekrar açar (kayıtlı kod ile yayına döner).
 */
class RestartReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_RESTART_CHECK) return
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val userExited = prefs.getBoolean(KEY_USER_EXIT, false)
        val savedCode = prefs.getString(KEY_BROADCAST_CODE, null)?.trim()
        if (userExited || savedCode.isNullOrEmpty()) return
        Log.d(TAG, "Restart check: opening MainActivity (saved code, user did not exit)")
        val launch = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        context.startActivity(launch)
    }

    companion object {
        private const val TAG = "MenuSlideTV"
        const val ACTION_RESTART_CHECK = "com.digitalsignage.tv.RESTART_CHECK"
        const val KEY_USER_EXIT = "user_requested_exit"
        private const val PREFS_NAME = "tv_player"
        private const val KEY_BROADCAST_CODE = "broadcast_code"
    }
}
