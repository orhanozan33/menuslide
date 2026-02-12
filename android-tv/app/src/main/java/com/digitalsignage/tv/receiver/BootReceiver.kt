package com.digitalsignage.tv.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.digitalsignage.tv.activation.ActivationActivity

/** Boot sonrası her zaman kod ekranı ile başlar; kullanıcı kayıtlı kodu seçip yayına geçer. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            val launch = Intent(context, ActivationActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(launch)
        }
    }
}
