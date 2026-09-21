package com.yose.project;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.yose.project.widgets.StrengthWidgetReceiver;
import com.yose.project.widgets.TimerWidgetReceiver;
import com.yose.project.widgets.TodayWidgetReceiver;
import com.yose.project.widgets.WeekWidgetReceiver;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

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

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename");
        String contents = call.getString("contents", "");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (filename == null || filename.trim().isEmpty()) {
            call.reject("Falta el nombre del archivo.");
            return;
        }

        filename = filename.replaceAll("[\\\\/:*?\"<>|]", "_");
        Context context = getContext();

        try {
            String displayPath = "Descargas/YOSES PROJECT/" + filename;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/YOSES PROJECT");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("Android no pudo crear el archivo en Descargas.");

                try (OutputStream output = context.getContentResolver().openOutputStream(uri, "w")) {
                    if (output == null) throw new IllegalStateException("No se pudo abrir el archivo para escritura.");
                    output.write(contents.getBytes(StandardCharsets.UTF_8));
                    output.flush();
                } catch (Exception error) {
                    context.getContentResolver().delete(uri, null, null);
                    throw error;
                }

                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                context.getContentResolver().update(uri, values, null, null);
            } else {
                File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File directory = new File(downloads, "YOSES PROJECT");
                if (!directory.exists() && !directory.mkdirs()) {
                    throw new IllegalStateException("No se pudo crear la carpeta de exportación.");
                }
                File target = new File(directory, filename);
                try (FileOutputStream output = new FileOutputStream(target)) {
                    output.write(contents.getBytes(StandardCharsets.UTF_8));
                    output.flush();
                }
            }

            JSObject result = new JSObject();
            result.put("path", displayPath);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo guardar el archivo en Descargas.", error);
        }
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
