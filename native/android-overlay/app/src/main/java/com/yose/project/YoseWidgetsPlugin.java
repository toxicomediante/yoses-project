package com.yose.project;

import android.app.backup.BackupManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
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
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "YoseWidgets")
public class YoseWidgetsPlugin extends Plugin {
    private static final String PRIVATE_BACKUP_DIR = "yoses_backup";
    private static final String AUTO_FILENAME = "yoses-project-auto-backup.json";
    private static final String MANUAL_RELATIVE = Environment.DIRECTORY_DOWNLOADS + "/YOSES PROJECT/";
    private static final String AUTO_RELATIVE = Environment.DIRECTORY_DOWNLOADS + "/YOSES PROJECT/AUTO/";

    @PluginMethod
    public void update(PluginCall call) {
        String snapshot = call.getString("snapshot", "{}");
        boolean persist = call.getBoolean("persist", true);
        Context context = getContext();

        context.getSharedPreferences("yoses_widgets", Context.MODE_PRIVATE)
            .edit()
            .putString("snapshot", snapshot)
            .apply();

        String backupPath = null;
        if (persist) {
            try {
                persistPrivateSnapshot(context, snapshot);
                backupPath = saveDownloadText(context, AUTO_FILENAME, snapshot, "application/json", AUTO_RELATIVE, true);
                new BackupManager(context).dataChanged();
            } catch (Exception error) {
                android.util.Log.e("YoseBackup", "No se pudo actualizar la copia automática.", error);
            }
        }

        refresh(context, TodayWidgetReceiver.class);
        refresh(context, WeekWidgetReceiver.class);
        refresh(context, StrengthWidgetReceiver.class);
        refresh(context, TimerWidgetReceiver.class);

        JSObject result = new JSObject();
        result.put("updated", true);
        if (backupPath != null) result.put("backupPath", backupPath);
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

        try {
            String path = saveDownloadText(getContext(), filename, contents, mimeType, MANUAL_RELATIVE, true);
            JSObject result = new JSObject();
            result.put("path", path);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo guardar el archivo en Descargas.", error);
        }
    }

    @PluginMethod
    public void getRecoverySnapshots(PluginCall call) {
        JSArray snapshots = new JSArray();
        Context context = getContext();
        try {
            File directory = new File(context.getFilesDir(), PRIVATE_BACKUP_DIR);
            addFileCandidate(snapshots, new File(directory, "latest.json"), "copia interna · última");
            addFileCandidate(snapshots, new File(directory, "previous-1.json"), "copia interna · anterior 1");
            addFileCandidate(snapshots, new File(directory, "previous-2.json"), "copia interna · anterior 2");
            addPublicCandidate(context, snapshots);
        } catch (Exception error) {
            android.util.Log.w("YoseBackup", "No se pudieron leer todas las copias de recuperación.", error);
        }

        JSObject result = new JSObject();
        result.put("snapshots", snapshots);
        call.resolve(result);
    }

    @PluginMethod
    public void clearRecoverySnapshots(PluginCall call) {
        Context context = getContext();
        try {
            File directory = new File(context.getFilesDir(), PRIVATE_BACKUP_DIR);
            deleteRecursively(directory);
            deletePublicAutoBackup(context);
            call.resolve();
        } catch (Exception error) {
            call.reject("No se pudieron borrar las copias automáticas.", error);
        }
    }

    private void persistPrivateSnapshot(Context context, String snapshot) throws Exception {
        File directory = new File(context.getFilesDir(), PRIVATE_BACKUP_DIR);
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IllegalStateException("No se pudo crear el directorio privado de backup.");
        }

        File latest = new File(directory, "latest.json");
        File previous1 = new File(directory, "previous-1.json");
        File previous2 = new File(directory, "previous-2.json");
        File temp = new File(directory, "latest.tmp");

        try (FileOutputStream output = new FileOutputStream(temp, false)) {
            output.write(snapshot.getBytes(StandardCharsets.UTF_8));
            output.flush();
            output.getFD().sync();
        }

        if (previous2.exists() && !previous2.delete()) {
            throw new IllegalStateException("No se pudo rotar previous-2.");
        }
        if (previous1.exists() && !previous1.renameTo(previous2)) {
            throw new IllegalStateException("No se pudo rotar previous-1.");
        }
        if (latest.exists() && !latest.renameTo(previous1)) {
            throw new IllegalStateException("No se pudo rotar latest.");
        }
        if (!temp.renameTo(latest)) {
            throw new IllegalStateException("No se pudo activar la nueva copia interna.");
        }
    }

    private String saveDownloadText(Context context, String filename, String contents, String mimeType, String relativePath, boolean overwrite) throws Exception {
        String displayPath = "Descargas/" + relativePath.substring(Environment.DIRECTORY_DOWNLOADS.length()).replaceAll("^/|/$", "") + "/" + filename;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Uri uri = overwrite ? findDownload(context, filename, relativePath) : null;
            boolean inserted = false;

            if (uri == null) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                inserted = true;
            }

            if (uri == null) throw new IllegalStateException("Android no pudo crear el archivo en Descargas.");

            try (OutputStream output = context.getContentResolver().openOutputStream(uri, "w")) {
                if (output == null) throw new IllegalStateException("No se pudo abrir el archivo para escritura.");
                output.write(contents.getBytes(StandardCharsets.UTF_8));
                output.flush();
            } catch (Exception error) {
                if (inserted) context.getContentResolver().delete(uri, null, null);
                throw error;
            }

            if (inserted) {
                ContentValues ready = new ContentValues();
                ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
                context.getContentResolver().update(uri, ready, null, null);
            }
        } else {
            File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            String child = relativePath.substring(Environment.DIRECTORY_DOWNLOADS.length()).replaceAll("^/|/$", "");
            File directory = new File(downloads, child);
            if (!directory.exists() && !directory.mkdirs()) {
                throw new IllegalStateException("No se pudo crear la carpeta de exportación.");
            }
            File target = new File(directory, filename);
            try (FileOutputStream output = new FileOutputStream(target, false)) {
                output.write(contents.getBytes(StandardCharsets.UTF_8));
                output.flush();
                output.getFD().sync();
            }
        }

        return displayPath;
    }

    private Uri findDownload(Context context, String filename, String relativePath) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null;

        String[] projection = { MediaStore.MediaColumns._ID, MediaStore.MediaColumns.RELATIVE_PATH };
        String selection = MediaStore.MediaColumns.DISPLAY_NAME + "=?";
        String[] args = { filename };

        try (Cursor cursor = context.getContentResolver().query(
            MediaStore.Downloads.EXTERNAL_CONTENT_URI,
            projection,
            selection,
            args,
            MediaStore.MediaColumns.DATE_MODIFIED + " DESC"
        )) {
            if (cursor == null) return null;
            int idIndex = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID);
            int pathIndex = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.RELATIVE_PATH);
            while (cursor.moveToNext()) {
                String path = cursor.getString(pathIndex);
                if (path != null && path.equals(relativePath)) {
                    long id = cursor.getLong(idIndex);
                    return Uri.withAppendedPath(MediaStore.Downloads.EXTERNAL_CONTENT_URI, Long.toString(id));
                }
            }
        } catch (Exception error) {
            android.util.Log.w("YoseBackup", "No se pudo localizar el backup público previo.", error);
        }
        return null;
    }

    private void addPublicCandidate(Context context, JSArray snapshots) {
        try {
            Uri uri = findDownload(context, AUTO_FILENAME, AUTO_RELATIVE);
            if (uri == null) return;
            try (InputStream input = context.getContentResolver().openInputStream(uri)) {
                if (input == null) return;
                String content = new String(input.readAllBytes(), StandardCharsets.UTF_8);
                addCandidate(snapshots, content, "Descargas/YOSES PROJECT/AUTO/" + AUTO_FILENAME);
            }
        } catch (Exception error) {
            android.util.Log.w("YoseBackup", "No se pudo leer el backup automático público.", error);
        }
    }

    private void addFileCandidate(JSArray snapshots, File file, String source) {
        if (!file.exists() || !file.isFile()) return;
        try (FileInputStream input = new FileInputStream(file)) {
            String content = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            addCandidate(snapshots, content, source);
        } catch (Exception error) {
            android.util.Log.w("YoseBackup", "No se pudo leer " + file.getName(), error);
        }
    }

    private void addCandidate(JSArray snapshots, String snapshot, String source) {
        if (snapshot == null || snapshot.trim().isEmpty()) return;
        JSObject item = new JSObject();
        item.put("snapshot", snapshot);
        item.put("source", source);
        snapshots.put(item);
    }

    private void deletePublicAutoBackup(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Uri uri = findDownload(context, AUTO_FILENAME, AUTO_RELATIVE);
            if (uri != null) {
                try { context.getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
            }
        } else {
            File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File target = new File(downloads, "YOSES PROJECT/AUTO/" + AUTO_FILENAME);
            if (target.exists()) target.delete();
        }
    }

    private void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) deleteRecursively(child);
            }
        }
        file.delete();
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
