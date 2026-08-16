package com.veilassist.interview;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NvidiaParakeetPlugin.class);
        super.onCreate(savedInstanceState);
        // After bridge is ready: GPU layer + no stretch overscroll (fixed chrome stays stable).
        final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.post(this::applyWebViewSmoothness);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        applyWebViewSmoothness();
    }

    private void applyWebViewSmoothness() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
    }
}
