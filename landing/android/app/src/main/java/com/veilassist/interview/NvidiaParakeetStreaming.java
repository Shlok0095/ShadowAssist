package com.veilassist.interview;

import com.google.protobuf.ByteString;
import io.grpc.ManagedChannel;
import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.okhttp.OkHttpChannelBuilder;
import io.grpc.stub.MetadataUtils;
import io.grpc.stub.StreamObserver;
import nvidia.riva.RivaAudio;
import nvidia.riva.asr.RivaAsr;
import nvidia.riva.asr.RivaSpeechRecognitionGrpc;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * NVIDIA Parakeet StreamingRecognize — real-time interim + final (same as Windows overlay).
 */
final class NvidiaParakeetStreaming {
    interface ResultListener {
        void onTranscript(String text, boolean isFinal);
        void onError(String message);
        void onEnd();
    }

    private ManagedChannel channel;
    private StreamObserver<RivaAsr.StreamingRecognizeRequest> requestObserver;
    private final AtomicBoolean active = new AtomicBoolean(false);
    private ResultListener listener;

    void start(String apiKey, String languageCode, String functionId, ResultListener listener)
            throws Exception {
        stop();
        this.listener = listener;
        active.set(true);

        String lang = languageCode == null || languageCode.trim().isEmpty() ? "multi" : languageCode.trim();
        String fnId =
                functionId == null || functionId.trim().isEmpty()
                        ? NvidiaParakeetGrpc.DEFAULT_FUNCTION_ID
                        : functionId.trim();

        channel = OkHttpChannelBuilder.forAddress(NvidiaParakeetGrpc.NVCF_HOST, NvidiaParakeetGrpc.NVCF_PORT)
                .build();

        Metadata metadata = new Metadata();
        metadata.put(Metadata.Key.of("function-id", Metadata.ASCII_STRING_MARSHALLER), fnId);
        metadata.put(
                Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
                "Bearer " + apiKey.trim());

        RivaSpeechRecognitionGrpc.RivaSpeechRecognitionStub stub =
                RivaSpeechRecognitionGrpc.newStub(channel)
                        .withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));

        StreamObserver<RivaAsr.StreamingRecognizeResponse> responseObserver =
                new StreamObserver<RivaAsr.StreamingRecognizeResponse>() {
                    @Override
                    public void onNext(RivaAsr.StreamingRecognizeResponse response) {
                        if (!active.get() || listener == null) return;
                        for (RivaAsr.StreamingRecognitionResult result : response.getResultsList()) {
                            if (result.getAlternativesCount() == 0) continue;
                            String text = result.getAlternatives(0).getTranscript().trim();
                            if (text.isEmpty()) continue;
                            listener.onTranscript(text, result.getIsFinal());
                        }
                    }

                    @Override
                    public void onError(Throwable t) {
                        if (!active.get() || listener == null) return;
                        String msg = t.getMessage() != null ? t.getMessage() : "streaming error";
                        if (t instanceof io.grpc.StatusRuntimeException) {
                            Status status = ((io.grpc.StatusRuntimeException) t).getStatus();
                            if (status.getDescription() != null) {
                                msg = status.getDescription().toString();
                            }
                        }
                        listener.onError(msg);
                    }

                    @Override
                    public void onCompleted() {
                        if (listener != null) listener.onEnd();
                    }
                };

        requestObserver = stub.streamingRecognize(responseObserver);

        RivaAsr.RecognitionConfig config =
                RivaAsr.RecognitionConfig.newBuilder()
                        .setEncoding(RivaAudio.AudioEncoding.LINEAR_PCM)
                        .setSampleRateHertz(16000)
                        .setLanguageCode(lang)
                        .setMaxAlternatives(1)
                        .setEnableAutomaticPunctuation(true)
                        .build();

        RivaAsr.StreamingRecognitionConfig streamingConfig =
                RivaAsr.StreamingRecognitionConfig.newBuilder()
                        .setConfig(config)
                        .setInterimResults(true)
                        .build();

        requestObserver.onNext(
                RivaAsr.StreamingRecognizeRequest.newBuilder().setStreamingConfig(streamingConfig).build());
    }

    void sendPcm(byte[] linear16) {
        if (!active.get() || requestObserver == null || linear16 == null || linear16.length == 0) return;
        requestObserver.onNext(
                RivaAsr.StreamingRecognizeRequest.newBuilder()
                        .setAudioContent(ByteString.copyFrom(linear16))
                        .build());
    }

    void stop() {
        active.set(false);
        if (requestObserver != null) {
            try {
                requestObserver.onCompleted();
            } catch (Exception ignored) {
                /* ignore */
            }
            requestObserver = null;
        }
        if (channel != null) {
            try {
                channel.shutdown().awaitTermination(2, TimeUnit.SECONDS);
            } catch (InterruptedException ignored) {
                channel.shutdownNow();
            }
            channel = null;
        }
        listener = null;
    }

    boolean isActive() {
        return active.get();
    }
}
