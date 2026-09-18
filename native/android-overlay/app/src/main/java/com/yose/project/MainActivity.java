package com.yose.project;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YoseWidgetsPlugin.class);
        applyWidgetRoute(getIntent());
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        applyWidgetRoute(intent);
        super.onNewIntent(intent);
    }

    private void applyWidgetRoute(Intent intent) {
        if (intent == null) return;
        String route = intent.getStringExtra("widget_route");
        if (route == null || route.isEmpty()) return;
        boolean start = intent.getBooleanExtra("widget_start", false);
        intent.setData(Uri.parse("yoses://" + route + (start ? "?start=1" : "")));
    }
}
