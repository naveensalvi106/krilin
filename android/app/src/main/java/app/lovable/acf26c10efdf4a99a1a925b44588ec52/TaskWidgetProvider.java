package app.lovable.acf26c10efdf4a99a1a925b44588ec52;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class TaskWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("EasyFlowWidgetPrefs", Context.MODE_PRIVATE);
        int count = prefs.getInt("pending_task_count", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_widget_layout);
        views.setTextViewText(R.id.widget_count_text, String.valueOf(count));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
