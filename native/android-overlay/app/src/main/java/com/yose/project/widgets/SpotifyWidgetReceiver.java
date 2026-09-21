package com.yose.project.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.provider.Settings;
import android.widget.RemoteViews;

import com.yose.project.MainActivity;
import com.yose.project.R;

import java.util.List;

public class SpotifyWidgetReceiver extends AppWidgetProvider {
    static final String SPOTIFY_PACKAGE = "com.spotify.music";
    private static final String ACTION_PREV = "com.yose.project.spotify.PREV";
    private static final String ACTION_PLAY = "com.yose.project.spotify.PLAY";
    private static final String ACTION_PAUSE = "com.yose.project.spotify.PAUSE";
    private static final String ACTION_NEXT = "com.yose.project.spotify.NEXT";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) updateWidget(context, manager, appWidgetId);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (ACTION_PREV.equals(action) || ACTION_PLAY.equals(action) || ACTION_PAUSE.equals(action) || ACTION_NEXT.equals(action)) {
            control(context, action);
            refreshAll(context);
            return;
        }
        super.onReceive(context, intent);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, SpotifyWidgetReceiver.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) updateWidget(context, manager, id);
    }

    static MediaController getSpotifyController(Context context) {
        if (!hasNotificationAccess(context)) return null;
        try {
            MediaSessionManager manager = (MediaSessionManager) context.getSystemService(Context.MEDIA_SESSION_SERVICE);
            ComponentName listener = new ComponentName(context, SpotifyNotificationListenerService.class);
            List<MediaController> controllers = manager.getActiveSessions(listener);
            for (MediaController controller : controllers) {
                if (SPOTIFY_PACKAGE.equals(controller.getPackageName())) return controller;
            }
        } catch (SecurityException ignored) {}
        return null;
    }

    private static boolean hasNotificationAccess(Context context) {
        String enabled = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        if (enabled == null || enabled.isEmpty()) return false;
        ComponentName component = new ComponentName(context, SpotifyNotificationListenerService.class);
        return enabled.contains(component.flattenToString()) || enabled.contains(component.flattenToShortString());
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        boolean access = hasNotificationAccess(context);
        MediaController controller = access ? getSpotifyController(context) : null;
        MediaMetadata metadata = controller != null ? controller.getMetadata() : null;
        PlaybackState state = controller != null ? controller.getPlaybackState() : null;
        boolean playing = state != null && (state.getState() == PlaybackState.STATE_PLAYING || state.getState() == PlaybackState.STATE_BUFFERING);

        RemoteViews views = new RemoteViews(context.getPackageName(), playing ? R.layout.widget_spotify_playing : R.layout.widget_spotify_paused);

        String title = metadata != null ? metadata.getString(MediaMetadata.METADATA_KEY_TITLE) : null;
        String artist = metadata != null ? metadata.getString(MediaMetadata.METADATA_KEY_ARTIST) : null;
        if ((artist == null || artist.isEmpty()) && metadata != null) artist = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST);

        if (!access) {
            views.setTextViewText(R.id.spotify_badge, "SPOTIFY · ACCESO");
            views.setTextViewText(R.id.spotify_title, "ACTIVA EL ACCESO");
            views.setTextViewText(R.id.spotify_artist, "TOCA PARA CONECTAR");
            Intent settings = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent openSettings = PendingIntent.getActivity(context, 6200 + appWidgetId, settings, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.spotify_widget_root, openSettings);
        } else {
            views.setTextViewText(R.id.spotify_badge, playing ? "SPOTIFY · PLAYING" : "SPOTIFY");
            views.setTextViewText(R.id.spotify_title, title != null && !title.isEmpty() ? title : "Nada sonando");
            views.setTextViewText(R.id.spotify_artist, artist != null && !artist.isEmpty() ? artist : "ABRE SPOTIFY");
            views.setOnClickPendingIntent(R.id.spotify_widget_root, spotifyLaunchIntent(context, appWidgetId));
        }

        int[] astros = {
            R.drawable.widget_spotify_astro_1,
            R.drawable.widget_spotify_astro_2,
            R.drawable.widget_spotify_astro_3,
            R.drawable.widget_spotify_astro_4
        };
        String seed = (title == null ? "" : title) + "|" + (artist == null ? "" : artist);
        int astro = astros[Math.floorMod(seed.hashCode(), astros.length)];
        views.setImageViewResource(R.id.spotify_astro_background, astro);

        views.setOnClickPendingIntent(R.id.spotify_prev, controlIntent(context, ACTION_PREV, 1));
        views.setOnClickPendingIntent(R.id.spotify_play, controlIntent(context, ACTION_PLAY, 2));
        views.setOnClickPendingIntent(R.id.spotify_pause, controlIntent(context, ACTION_PAUSE, 3));
        views.setOnClickPendingIntent(R.id.spotify_next, controlIntent(context, ACTION_NEXT, 4));

        manager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent controlIntent(Context context, String action, int code) {
        Intent intent = new Intent(context, SpotifyWidgetReceiver.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 6300 + code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent spotifyLaunchIntent(Context context, int appWidgetId) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(SPOTIFY_PACKAGE);
        if (launch == null) launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(context, 6400 + appWidgetId, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void control(Context context, String action) {
        MediaController controller = getSpotifyController(context);
        if (controller == null) return;
        MediaController.TransportControls controls = controller.getTransportControls();
        if (ACTION_PREV.equals(action)) controls.skipToPrevious();
        else if (ACTION_PLAY.equals(action)) controls.play();
        else if (ACTION_PAUSE.equals(action)) controls.pause();
        else if (ACTION_NEXT.equals(action)) controls.skipToNext();
    }
}
