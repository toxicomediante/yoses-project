package com.yose.project;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YoseWidgetsPlugin.class);
        applyWidgetRoute(getIntent());
        super.onCreate(savedInstanceState);
        applySystemBarTheme();
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

    private void applySystemBarTheme() {
        Window window = getWindow();
        int ritualBlack = Color.rgb(5, 7, 6);
        window.setStatusBarColor(ritualBlack);
        window.setNavigationBarColor(ritualBlack);
        window.getDecorView().setSystemUiVisibility(0);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
    }
}
