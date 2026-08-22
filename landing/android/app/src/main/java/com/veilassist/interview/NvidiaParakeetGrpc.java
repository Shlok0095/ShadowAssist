package com.veilassist.interview;

import com.google.protobuf.ByteString;
import io.grpc.ManagedChannel;
import io.grpc.Metadata;
import io.grpc.okhttp.OkHttpChannelBuilder;
import io.grpc.stub.MetadataUtils;
import nvidia.riva.RivaAudio;
import nvidia.riva.asr.RivaAsr;
import nvidia.riva.asr.RivaSpeechRecognitionGrpc;

import java.util.concurrent.TimeUnit;

/**
 * Direct NVCF Parakeet ASR — same gRPC path as Windows overlay (lib/nvidiaNimStt.js).
 */
final class NvidiaParakeetGrpc {
    static final String NVCF_HOST = "grpc.nvcf.nvidia.com";
    static final int NVCF_PORT = 443;
    static final String DEFAULT_FUNCTION_ID = "71203149-d3b7-4460-8231-1be2543a1fca";

    private NvidiaParakeetGrpc() {}

    static String transcribeWav(byte[] wavBytes, String apiKey, String languageCode, String functionId)
            throws Exception {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("NVIDIA API key missing");
        }
        if (wavBytes == null || wavBytes.length == 0) {
            throw new IllegalArgumentException("Empty audio buffer");
        }

        PcmSlice pcm = pcmFromWav(wavBytes);
        String lang = languageCode == null || languageCode.trim().isEmpty() ? "multi" : languageCode.trim();
        String fnId = functionId == null || functionId.trim().isEmpty() ? DEFAULT_FUNCTION_ID : functionId.trim();

        ManagedChannel channel = OkHttpChannelBuilder
                .forAddress(NVCF_HOST, NVCF_PORT)
                .build();

        try {
            Metadata metadata = new Metadata();
            metadata.put(
                    Metadata.Key.of("function-id", Metadata.ASCII_STRING_MARSHALLER),
                    fnId);
            metadata.put(
                    Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
                    "Bearer " + apiKey.trim());

            RivaSpeechRecognitionGrpc.RivaSpeechRecognitionBlockingStub stub =
                    RivaSpeechRecognitionGrpc.newBlockingStub(channel)
                            .withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));

            RivaAsr.RecognitionConfig config = RivaAsr.RecognitionConfig.newBuilder()
                    .setEncoding(RivaAudio.AudioEncoding.LINEAR_PCM)
                    .setSampleRateHertz(pcm.sampleRate)
                    .setLanguageCode(lang)
                    .setMaxAlternatives(1)
                    .setEnableAutomaticPunctuation(true)
                    .build();

            RivaAsr.RecognizeRequest request = RivaAsr.RecognizeRequest.newBuilder()
                    .setConfig(config)
                    .setAudio(ByteString.copyFrom(pcm.pcm))
                    .build();

            RivaAsr.RecognizeResponse response = stub.recognize(request);
            if (response.getResultsCount() == 0) return "";
            if (response.getResults(0).getAlternativesCount() == 0) return "";
            return response.getResults(0).getAlternatives(0).getTranscript().trim();
        } finally {
            try {
                channel.shutdown().awaitTermination(3, TimeUnit.SECONDS);
            } catch (InterruptedException ignored) {
                channel.shutdownNow();
            }
        }
    }

    private static PcmSlice pcmFromWav(byte[] buf) {
        if (buf.length > 44
                && buf[0] == 'R'
                && buf[1] == 'I'
                && buf[2] == 'F'
                && buf[3] == 'F') {
            int sampleRate =
                    (buf[24] & 0xff)
                            | ((buf[25] & 0xff) << 8)
                            | ((buf[26] & 0xff) << 16)
                            | ((buf[27] & 0xff) << 24);
            if (sampleRate <= 0) sampleRate = 16000;
            byte[] pcm = new byte[buf.length - 44];
            System.arraycopy(buf, 44, pcm, 0, pcm.length);
            return new PcmSlice(sampleRate, pcm);
        }
        return new PcmSlice(16000, buf);
    }

    private static final class PcmSlice {
        final int sampleRate;
        final byte[] pcm;

        PcmSlice(int sampleRate, byte[] pcm) {
            this.sampleRate = sampleRate;
            this.pcm = pcm;
        }
    }
}
