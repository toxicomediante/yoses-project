package com.yose.project;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

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

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applySystemBarTheme();
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
        // Run the WebView edge-to-edge on every Android device. The system
        // bars are transient (swipe from an edge) so the app never sits inside
        // a coloured native canvas supplied by a manufacturer theme.
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(ritualBlack);
        window.setNavigationBarColor(ritualBlack);
        window.getDecorView().setSystemUiVisibility(0);
        WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(window, window.getDecorView());
        insets.setAppearanceLightStatusBars(false);
        insets.setAppearanceLightNavigationBars(false);
        insets.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        insets.hide(WindowInsetsCompat.Type.systemBars());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
    }
}
