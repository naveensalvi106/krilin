package app.lovable.acf26c10efdf4a99a1a925b44588ec52;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod()
    public void updateWidget(PluginCall call) {
        int count = call.getInt("count", 0);
        String taskList = call.getString("taskList", "");

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("EasyFlowWidgetPrefs", Context.MODE_PRIVATE);
        prefs.edit()
            .putInt("pending_task_count", count)
            .putString("pending_task_list", taskList)
            .apply();

        TaskWidgetProvider.triggerUpdate(context);

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}
