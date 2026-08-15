package com.veilassist.interview;

import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor bridge — direct NVIDIA Parakeet gRPC on Android (batch + streaming).
 */
@CapacitorPlugin(name = "NvidiaParakeet")
public class NvidiaParakeetPlugin extends Plugin {
    private NvidiaParakeetStreaming streaming;

    @PluginMethod
    public void transcribeWav(PluginCall call) {
        String apiKey = call.getString("apiKey");
        String audioBase64 = call.getString("audioBase64");
        String languageCode = call.getString("languageCode", "multi");
        String functionId = call.getString("functionId", NvidiaParakeetGrpc.DEFAULT_FUNCTION_ID);

        if (apiKey == null || apiKey.trim().isEmpty()) {
            call.reject("NVIDIA API key missing");
            return;
        }
        if (audioBase64 == null || audioBase64.trim().isEmpty()) {
            call.reject("Missing audioBase64");
            return;
        }

        new Thread(() -> {
            try {
                byte[] wav = Base64.decode(audioBase64, Base64.DEFAULT);
                String text = NvidiaParakeetGrpc.transcribeWav(wav, apiKey, languageCode, functionId);
                JSObject ret = new JSObject();
                ret.put("text", text);
                call.resolve(ret);
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "NVIDIA transcription failed";
                call.reject(msg, e);
            }
        }).start();
    }

    @PluginMethod
    public void startStreaming(PluginCall call) {
        String apiKey = call.getString("apiKey");
        String languageCode = call.getString("languageCode", "multi");
        String functionId = call.getString("functionId", NvidiaParakeetGrpc.DEFAULT_FUNCTION_ID);

        if (apiKey == null || apiKey.trim().isEmpty()) {
            call.reject("NVIDIA API key missing");
            return;
        }

        if (streaming != null) {
            streaming.stop();
            streaming = null;
        }

        new Thread(() -> {
            try {
                NvidiaParakeetStreaming session = new NvidiaParakeetStreaming();
                streaming = session;
                session.start(
                        apiKey,
                        languageCode,
                        functionId,
                        new NvidiaParakeetStreaming.ResultListener() {
                            @Override
                            public void onTranscript(String text, boolean isFinal) {
                                JSObject data = new JSObject();
                                data.put("text", text);
                                data.put("isFinal", isFinal);
                                notifyListeners("transcript", data);
                            }

                            @Override
                            public void onError(String message) {
                                JSObject data = new JSObject();
                                data.put("message", message);
                                notifyListeners("streamError", data);
                            }

                            @Override
                            public void onEnd() {
                                notifyListeners("streamEnd", new JSObject());
                            }
                        });
                call.resolve();
            } catch (Exception e) {
                streaming = null;
                String msg = e.getMessage() != null ? e.getMessage() : "NVIDIA streaming failed";
                call.reject(msg, e);
            }
        }).start();
    }

    @PluginMethod
    public void sendStreamingPcm(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.isEmpty() || streaming == null) {
            call.resolve();
            return;
        }
        try {
            byte[] pcm = Base64.decode(data, Base64.DEFAULT);
            streaming.sendPcm(pcm);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "send failed");
        }
    }

    @PluginMethod
    public void stopStreaming(PluginCall call) {
        if (streaming != null) {
            streaming.stop();
            streaming = null;
        }
        call.resolve();
    }
}
