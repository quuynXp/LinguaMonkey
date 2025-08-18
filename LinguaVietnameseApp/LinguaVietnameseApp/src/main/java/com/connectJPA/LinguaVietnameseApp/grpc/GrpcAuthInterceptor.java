package com.connectJPA.LinguaVietnameseApp.grpc;

import io.grpc.*;

public class GrpcAuthInterceptor implements ClientInterceptor {
    private final String token;

    public GrpcAuthInterceptor(String token) {
        this.token = token;
    }

    @Override
    public <ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
            MethodDescriptor<ReqT, RespT> method,
            CallOptions callOptions,
            Channel channel) {
        Metadata metadata = new Metadata();
        metadata.put(Metadata.Key.of("Authorization", Metadata.ASCII_STRING_MARSHALLER), "Bearer " + token);
        return new ForwardingClientCall.SimpleForwardingClientCall<ReqT, RespT>(channel.newCall(method, callOptions)) {
            @Override
            public void start(Listener<RespT> responseListener, Metadata headers) {
                headers.merge(metadata);
                super.start(responseListener, headers);
            }
        };
    }
}
