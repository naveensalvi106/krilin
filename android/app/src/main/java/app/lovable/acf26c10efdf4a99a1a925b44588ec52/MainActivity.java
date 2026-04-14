package app.lovable.acf26c10efdf4a99a1a925b44588ec52;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(WidgetBridge.class);
    }
}

@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridge extends Plugin {
    @PluginMethod
    public void updateWidget(PluginCall call) {
        Integer count = call.getInt("count");
        if (count == null) {
            call.reject("Count is required");
            return;
        }

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("EasyFlowWidgetPrefs", Context.MODE_PRIVATE);
        prefs.edit().putInt("pending_task_count", count).apply();

        // Notify the widget to update
        Intent intent = new Intent(context, TaskWidgetProvider.class);
        intent.setAction(android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = android.appwidget.AppWidgetManager.getInstance(context)
                .getAppWidgetIds(new android.content.ComponentName(context, TaskWidgetProvider.class));
        intent.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);

        call.resolve();
    }
}
