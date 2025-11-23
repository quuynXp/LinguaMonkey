package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.kafka.AiChatPersistenceRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/internal/persistence")
@RequiredArgsConstructor
@Slf4j
public class InternalPersistenceController {

    private final ChatMessageService chatMessageService;

    @PostMapping("/chat")
    public ResponseEntity<Void> persistChatMessage(@RequestBody AiChatPersistenceRequest request) {
        try {
            log.info("Received internal chat persistence request from Python for room: {}", request.getRoomId());
            
            UUID roomId = UUID.fromString(request.getRoomId());
            UUID userId = UUID.fromString(request.getUserId());

            // 1. Lưu tin nhắn của User
            ChatMessageRequest userMsgRequest = ChatMessageRequest.builder()
                    .roomId(roomId)
                    .senderId(userId)
                    .receiverId(null)
                    .content(request.getUserPrompt())
                    .messageType(request.getMessageType())
                    .purpose(RoomPurpose.AI_CHAT)
                    .isRead(true)
                    .build();

            chatMessageService.saveMessageInternal(roomId, userMsgRequest);

            // 2. Lưu tin nhắn của AI
            ChatMessageRequest aiMsgRequest = ChatMessageRequest.builder()
                    .roomId(roomId)
                    .senderId(null)
                    .receiverId(userId)
                    .content(request.getAiResponse())
                    .messageType(request.getMessageType())
                    .purpose(RoomPurpose.AI_CHAT)
                    .isRead(false)
                    .build();

            chatMessageService.saveMessageInternal(roomId, aiMsgRequest);

            log.info("Successfully persisted AI chat history for room: {}", roomId);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            log.error("Failed to process internal chat persistence request: {}", e.getMessage(), e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}