package com.yose.project;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.yose.project.widgets.StrengthWidgetReceiver;
import com.yose.project.widgets.TimerWidgetReceiver;
import com.yose.project.widgets.TodayWidgetReceiver;
import com.yose.project.widgets.WeekWidgetReceiver;

@CapacitorPlugin(name = "YoseWidgets")
public class YoseWidgetsPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String snapshot = call.getString("snapshot", "{}");
        Context context = getContext();
        context.getSharedPreferences("yoses_widgets", Context.MODE_PRIVATE)
            .edit()
            .putString("snapshot", snapshot)
            .apply();

        refresh(context, TodayWidgetReceiver.class);
        refresh(context, WeekWidgetReceiver.class);
        refresh(context, StrengthWidgetReceiver.class);
        refresh(context, TimerWidgetReceiver.class);

        JSObject result = new JSObject();
        result.put("updated", true);
        call.resolve(result);
    }

    private void refresh(Context context, Class<?> receiverClass) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, receiverClass);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids.length == 0) return;
        Intent intent = new Intent(context, receiverClass);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }
}
