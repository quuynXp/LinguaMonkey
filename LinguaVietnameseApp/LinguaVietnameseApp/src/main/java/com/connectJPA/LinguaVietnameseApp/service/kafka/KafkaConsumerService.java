// package com.connectJPA.LinguaVietnameseApp.service.kafka;

// import com.connectJPA.LinguaVietnameseApp.dto.kafka.AiChatPersistenceRequest;
// import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
// import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
// import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.kafka.annotation.KafkaListener;
// import org.springframework.stereotype.Service;

// import java.util.UUID;

// @Service
// @Slf4j
// @RequiredArgsConstructor
// public class KafkaConsumerService {

//     private final ObjectMapper objectMapper;
//     private final ChatMessageService chatMessageService;

//     @KafkaListener(topics = "${kafka.chat.persistence.topic}", groupId = "${kafka.consumer.group-id}")
//     public void consumeChatMessage(String message) {
//         try {
//             log.info("Received chat persistence event from Kafka: {}", message);
//             AiChatPersistenceRequest request = objectMapper.readValue(message, AiChatPersistenceRequest.class);

//             UUID roomId = UUID.fromString(request.getRoomId());
//             UUID userId = UUID.fromString(request.getUserId());

//             // 1. Lưu tin nhắn của User
//             ChatMessageRequest userMsgRequest = ChatMessageRequest.builder()
//                     .roomId(roomId)
//                     .senderId(userId) // User là người gửi
//                     .receiverId(null) // AI chat không có receiver cụ thể
//                     .content(request.getUserPrompt())
//                     .messageType(request.getMessageType())
//                     .purpose(RoomPurpose.AI_CHAT) // Quan trọng
//                     .isRead(true) // User tự gửi nên đã đọc
//                     .build();
            
//             chatMessageService.saveMessageInternal(roomId, userMsgRequest);

//             // 2. Lưu tin nhắn của AI
//             ChatMessageRequest aiMsgRequest = ChatMessageRequest.builder()
//                     .roomId(roomId)
//                     .senderId(null) // AI (hệ thống) là người gửi
//                     .receiverId(userId) // Gửi cho user
//                     .content(request.getAiResponse())
//                     .messageType(request.getMessageType())
//                     .purpose(RoomPurpose.AI_CHAT) // Quan trọng
//                     .isRead(false) // User chưa đọc (sẽ update qua STOMP sau)
//                     .build();

//             chatMessageService.saveMessageInternal(roomId, aiMsgRequest);
            
//             log.info("Successfully saved AI chat history for room: {}", roomId);

//         } catch (Exception e) {
//             log.error("Failed to process chat persistence event: {}", message, e);
//         }
//     }
// }