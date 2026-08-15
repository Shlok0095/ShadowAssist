package com.veilassist.interview;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NvidiaParakeetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
