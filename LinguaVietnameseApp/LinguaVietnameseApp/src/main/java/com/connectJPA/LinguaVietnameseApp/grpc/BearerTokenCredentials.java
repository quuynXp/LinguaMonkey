package com.connectJPA.LinguaVietnameseApp.grpc;

import io.grpc.CallCredentials;
import io.grpc.Metadata;
import io.grpc.Status;

import java.util.concurrent.Executor;

public class BearerTokenCredentials extends CallCredentials {

    private final String token;

    public BearerTokenCredentials(String token) {
        this.token = token;
    }

    @Override
    public void applyRequestMetadata(RequestInfo requestInfo, Executor appExecutor, MetadataApplier applier) {
        appExecutor.execute(() -> {
            try {
                Metadata headers = new Metadata();
                Metadata.Key<String> authorizationKey = Metadata.Key.of("Authorization", Metadata.ASCII_STRING_MARSHALLER);
                
                String value = (token.startsWith("Bearer ")) ? token : "Bearer " + token;
                
                headers.put(authorizationKey, value);
                applier.apply(headers);
            } catch (Throwable e) {
                applier.fail(Status.UNAUTHENTICATED.withCause(e));
            }
        });
    }

    @Override
    public void thisUsesUnstableApi() {
    }
}