package com.yose.project.widgets;

import android.content.ComponentName;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.ArrayList;
import java.util.List;

public class SpotifyNotificationListenerService extends NotificationListenerService {
    private MediaSessionManager mediaSessionManager;
    private final List<MediaController> observedControllers = new ArrayList<>();

    private final MediaController.Callback controllerCallback = new MediaController.Callback() {
        @Override public void onMetadataChanged(android.media.MediaMetadata metadata) {
            SpotifyWidgetReceiver.refreshAll(SpotifyNotificationListenerService.this);
        }
        @Override public void onPlaybackStateChanged(android.media.session.PlaybackState state) {
            SpotifyWidgetReceiver.refreshAll(SpotifyNotificationListenerService.this);
        }
    };

    private final MediaSessionManager.OnActiveSessionsChangedListener sessionListener = controllers -> {
        observeSpotifyControllers(controllers);
        SpotifyWidgetReceiver.refreshAll(SpotifyNotificationListenerService.this);
    };

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        mediaSessionManager = (MediaSessionManager) getSystemService(MEDIA_SESSION_SERVICE);
        ComponentName component = new ComponentName(this, SpotifyNotificationListenerService.class);
        try {
            mediaSessionManager.addOnActiveSessionsChangedListener(sessionListener, component);
            observeSpotifyControllers(mediaSessionManager.getActiveSessions(component));
        } catch (SecurityException ignored) {}
        SpotifyWidgetReceiver.refreshAll(this);
    }

    @Override
    public void onListenerDisconnected() {
        clearObservedControllers();
        if (mediaSessionManager != null) {
            try { mediaSessionManager.removeOnActiveSessionsChangedListener(sessionListener); } catch (Exception ignored) {}
        }
        super.onListenerDisconnected();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn != null && SpotifyWidgetReceiver.SPOTIFY_PACKAGE.equals(sbn.getPackageName())) {
            SpotifyWidgetReceiver.refreshAll(this);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn != null && SpotifyWidgetReceiver.SPOTIFY_PACKAGE.equals(sbn.getPackageName())) {
            SpotifyWidgetReceiver.refreshAll(this);
        }
    }

    private void observeSpotifyControllers(List<MediaController> controllers) {
        clearObservedControllers();
        if (controllers == null) return;
        for (MediaController controller : controllers) {
            if (!SpotifyWidgetReceiver.SPOTIFY_PACKAGE.equals(controller.getPackageName())) continue;
            try {
                controller.registerCallback(controllerCallback);
                observedControllers.add(controller);
            } catch (Exception ignored) {}
        }
    }

    private void clearObservedControllers() {
        for (MediaController controller : observedControllers) {
            try { controller.unregisterCallback(controllerCallback); } catch (Exception ignored) {}
        }
        observedControllers.clear();
    }
}
