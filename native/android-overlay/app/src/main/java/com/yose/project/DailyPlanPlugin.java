package com.yose.project;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URL;
import java.net.HttpURLConnection;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import android.util.Base64;
import java.util.UUID;

@CapacitorPlugin(name="DailyPlan")
public class DailyPlanPlugin extends Plugin {
    private static final String ID="1vDWxcVZPGY-ZCk9ncZmkuy-fTpiBg7gq";
    @PluginMethod public void load(PluginCall call) {
        new Thread(() -> {
            String nonce=UUID.randomUUID().toString();
            String[] urls={
                "https://drive.usercontent.google.com/download?id="+ID+"&export=download&confirm=t&fresh="+nonce,
                "https://drive.google.com/uc?export=download&id="+ID+"&confirm=t&fresh="+nonce
            };
            for(String address:urls) {
                HttpURLConnection conn=null;
                try {
                    // Follow redirects manually to retain no-cache directives.
                    for(int hop=0;hop<8;hop++){
                        conn=(HttpURLConnection)new URL(address).openConnection();
                        conn.setInstanceFollowRedirects(false);
                        conn.setUseCaches(false);
                        conn.setDefaultUseCaches(false);
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(20000);
                        conn.setRequestProperty("Cache-Control","no-cache, no-store, max-age=0");
                        conn.setRequestProperty("Pragma","no-cache");
                        conn.setRequestProperty("Accept","image/png, application/octet-stream");
                        int code=conn.getResponseCode();
                        if(code>=300&&code<400){
                            String location=conn.getHeaderField("Location");
                            if(location==null)throw new Exception("Missing redirect");
                            URL next=new URL(new URL(address),location);
                            conn.disconnect();conn=null;
                            if(!"https".equals(next.getProtocol()))throw new Exception("Invalid redirect");
                            address=next.toString();continue;
                        }
                        if(code!=200)throw new Exception("HTTP "+code);
                        ByteArrayOutputStream out=new ByteArrayOutputStream();
                        try(InputStream in=conn.getInputStream()){
                            byte[] buf=new byte[8192];int n;
                            while((n=in.read(buf))!=-1){
                                if(out.size()+n>20*1024*1024)throw new Exception("Image too large");
                                out.write(buf,0,n);
                            }
                        }
                        byte[] bytes=out.toByteArray();
                        if(bytes.length<8||(bytes[0]&255)!=137||bytes[1]!=80||bytes[2]!=78||bytes[3]!=71||bytes[4]!=13||bytes[5]!=10||bytes[6]!=26||bytes[7]!=10)throw new Exception("Not a PNG");
                        JSObject result=new JSObject();
                        result.put("image","data:image/png;base64,"+Base64.encodeToString(bytes,Base64.NO_WRAP));
                        call.resolve(result);return;
                    }
                }catch(Exception ignored){}finally{if(conn!=null)conn.disconnect();}
            }
            call.reject("No se pudo obtener el PNG de Google Drive");
        }).start();
    }
}
