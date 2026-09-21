package com.yose.project.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class SpotifyWideWidgetReceiver extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            SpotifyWidgetReceiver.updateWidget(context, manager, appWidgetId, true);
        }
    }
}
