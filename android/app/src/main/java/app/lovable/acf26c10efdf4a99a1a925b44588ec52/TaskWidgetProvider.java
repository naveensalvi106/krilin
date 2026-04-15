package app.lovable.acf26c10efdf4a99a1a925b44588ec52;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

public class TaskWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_REFRESH = "app.lovable.acf26c10efdf4a99a1a925b44588ec52.ACTION_REFRESH_WIDGET";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(
                new ComponentName(context, TaskWidgetProvider.class)
            );
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("EasyFlowWidgetPrefs", Context.MODE_PRIVATE);
        int count = prefs.getInt("pending_task_count", 0);
        String taskList = prefs.getString("pending_task_list", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_widget_layout);
        views.setTextViewText(R.id.widget_count_text, String.valueOf(count));

        // Show task names if available
        if (!taskList.isEmpty()) {
            views.setTextViewText(R.id.widget_task_list, taskList);
            views.setViewVisibility(R.id.widget_task_list, android.view.View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_task_list, android.view.View.GONE);
        }

        // Tap widget to open app
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        }

        // Refresh button
        Intent refreshIntent = new Intent(context, TaskWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(context, 1, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_refresh_btn, refreshPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void triggerUpdate(Context context) {
        Intent intent = new Intent(context, TaskWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context)
            .getAppWidgetIds(new ComponentName(context, TaskWidgetProvider.class));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }
}
