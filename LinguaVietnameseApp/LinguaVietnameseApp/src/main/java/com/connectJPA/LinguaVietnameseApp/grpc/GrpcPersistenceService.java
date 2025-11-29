package com.connectJPA.LinguaVietnameseApp.grpc;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
import io.grpc.stub.StreamObserver;
import learning.PersistenceServiceGrpc;
import learning.SaveChatRequest;
import learning.SaveChatResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.UUID;

@GrpcService
@Slf4j
@RequiredArgsConstructor
public class GrpcPersistenceService extends PersistenceServiceGrpc.PersistenceServiceImplBase {

    private final ChatMessageService chatMessageService;

    @Override
    public void saveChatMessage(SaveChatRequest request, StreamObserver<SaveChatResponse> responseObserver) {
        try {
            log.info("Received gRPC request to save chat for room: {}", request.getRoomId());

            ChatMessageRequest messageRequest = ChatMessageRequest.builder()
                    .senderId(UUID.fromString(request.getSenderId()))
                    .content(request.getContent())
                    .messageType(MessageType.valueOf(request.getMessageType()))
                    .purpose(RoomPurpose.AI_CHAT) // Enforce AI_CHAT purpose for this flow
                    .mediaUrl(null)
                    .build();

            chatMessageService.saveMessageInternal(UUID.fromString(request.getRoomId()), messageRequest);

            SaveChatResponse response = SaveChatResponse.newBuilder()
                    .setSuccess(true)
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("Failed to save chat message via gRPC: {}", e.getMessage(), e);
            SaveChatResponse response = SaveChatResponse.newBuilder()
                    .setSuccess(false)
                    .setError(e.getMessage())
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        }
    }
}