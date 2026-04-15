package app.lovable.acf26c10efdf4a99a1a925b44588ec52;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Re-triggers widget update and re-schedules notifications after device reboot.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            // Refresh widget
            TaskWidgetProvider.triggerUpdate(context);
        }
    }
}
