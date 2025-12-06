package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.ChatMessageBody;
import com.connectJPA.LinguaVietnameseApp.dto.TranslationEvent;
import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TypingStatusRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatStatsResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.entity.RoomMember;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import com.connectJPA.LinguaVietnameseApp.enums.NotificationType;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomMemberRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageSource messageSource;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GrpcClientService grpcClientService;
    private final AuthenticationService authenticationService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Data
    @Builder
    public static class UserStatusRequest {
        private UUID userId;
        private String status;
    }

    /**
     * PHƯƠNG THỨC QUAN TRỌNG: Xử lý an toàn Principal
     * Chấp nhận cả UUID string lẫn Email/Phone để tìm ra UserID thật.
     */
    private UUID getUserIdFromPrincipal(Principal principal) {
        if (principal == null) {
            log.error("Principal is null. User not authenticated via WebSocket.");
            return null;
        }
        
        String principalName = principal.getName();
        try {
            // 1. Cố gắng parse trực tiếp sang UUID (Nếu Token sub = UUID và Security Config giữ nguyên)
            return UUID.fromString(principalName);
        } catch (IllegalArgumentException e) {
            // 2. Nếu lỗi, nghĩa là principalName đang là Email hoặc Phone (do UserDetailsService load lên)
            log.info("Principal '{}' is not UUID. Resolving from DB...", principalName);
            
            return userRepository.findByEmailAndIsDeletedFalse(principalName)
                    .map(User::getUserId)
                    .or(() -> userRepository.findByPhoneAndIsDeletedFalse(principalName).map(User::getUserId))
                    .orElseThrow(() -> {
                        log.error("Cannot resolve UserID from principal: {}", principalName);
                        return new AppException(ErrorCode.USER_NOT_FOUND);
                    });
        }
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<AppApiResponse<Boolean>> getUserOnlineStatus(@PathVariable UUID userId, Locale locale) {
        String redisKey = "user:online:" + userId.toString();
        Boolean isOnline = redisTemplate.hasKey(redisKey);
        
        return ResponseEntity.ok(AppApiResponse.<Boolean>builder()
                .code(200)
                .result(isOnline != null && isOnline)
                .message("Success")
                .build());
    }

    @Operation(summary = "Get chat messages by room ID", description = "Get paginated messages for a room")
    @GetMapping("/room/{roomId}/messages")
    public AppApiResponse<Page<ChatMessageResponse>> getMessagesByRoom(
            @PathVariable UUID roomId,
            Pageable pageable,
            Locale locale) {
        Page<ChatMessageResponse> messages = chatMessageService.getMessagesByRoom(roomId, pageable);
        return AppApiResponse.<Page<ChatMessageResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("chatMessage.list.success", null, locale))
                .result(messages)
                .build();
    }

    @GetMapping("/stats/{userId}")
    public ResponseEntity<AppApiResponse<ChatStatsResponse>> getStats(
            @PathVariable UUID userId,
            Locale locale) {

        ChatStatsResponse stats = chatMessageService.getStatsByUser(userId);

        AppApiResponse<ChatStatsResponse> res = AppApiResponse.<ChatStatsResponse>builder()
                .code(200)
                .message(messageSource.getMessage("chat.stats.success", null, locale))
                .result(stats)
                .build();

        return ResponseEntity.ok(res);
    }

    @Operation(summary = "Delete a chat message", description = "Soft delete a chat message by ID (only within 5 mins)")
    @DeleteMapping("/messages/{id}")
    public AppApiResponse<Void> deleteChatMessage(
            @PathVariable UUID id,
            Locale locale) {
        chatMessageService.deleteChatMessage(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("chatMessage.deleted.success", null, locale))
                .build();
    }

    @Operation(summary = "Edit a chat message", description = "Edit chat message content by ID (only within 5 mins)")
    @PutMapping("/messages/{id}")
    public AppApiResponse<ChatMessageResponse> editChatMessage(
            @PathVariable UUID id,
            @RequestBody ChatMessageRequest request,
            Locale locale) {
        ChatMessageResponse updatedMessage = chatMessageService.editChatMessage(id, request.getContent());
        messagingTemplate.convertAndSend("/topic/room/" + updatedMessage.getRoomId(), updatedMessage);
        
        return AppApiResponse.<ChatMessageResponse>builder()
                .code(200)
                .message(messageSource.getMessage("chatMessage.updated.success", null, locale))
                .result(updatedMessage)
                .build();
    }

    @MessageMapping("/chat/room/{roomId}")
    public void sendMessage(
            @DestinationVariable UUID roomId,
            @Payload ChatMessageRequest messageRequest,
            Principal principal,
            SimpMessageHeaderAccessor headerAccessor) {
        
        try {
            // Lấy token để gọi Python service
            String authorization = headerAccessor.getFirstNativeHeader("Authorization");
            String token = extractToken(authorization, headerAccessor);

            // --- FIX: Lấy UserID an toàn ---
            UUID senderId = getUserIdFromPrincipal(principal);
            if (senderId == null) return; // Đã log error bên trong hàm
            // -------------------------------

            messageRequest.setSenderId(senderId);
            messageRequest.setRoomId(roomId);

            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

            // 1. Save User Message (Lưu DB)
            ChatMessageResponse message = chatMessageService.saveMessage(roomId, messageRequest);

            // 2. Broadcast User Message
            if (room.getPurpose() == RoomPurpose.PRIVATE_CHAT) {
                messagingTemplate.convertAndSendToUser(message.getSenderId().toString(), "/queue/messages", message);
                messagingTemplate.convertAndSendToUser(message.getReceiverId().toString(), "/queue/messages", message);
                sendPushNotification(senderId, message.getReceiverId(), room, message.getContent());
            } else if (room.getPurpose() == RoomPurpose.GROUP_CHAT) {
                messagingTemplate.convertAndSend("/topic/room/" + roomId, message);
                List<RoomMember> members = roomMemberRepository.findAllByIdRoomIdAndIsDeletedFalse(roomId);
                for (RoomMember member : members) {
                    UUID memberId = member.getId().getUserId();
                    if (!memberId.equals(senderId)) {
                        sendPushNotification(senderId, memberId, room, message.getContent());
                    }
                }
            } else if (room.getPurpose() == RoomPurpose.AI_CHAT) {
                // For AI Chat: Send user message back to user via private queue
                messagingTemplate.convertAndSendToUser(senderId.toString(), "/queue/messages", message);

                // 3. AI Logic Processing (ASYNC)
                CompletableFuture.runAsync(() -> {
                    try {
                        Pageable pageable = PageRequest.of(0, 10);
                        Page<ChatMessageResponse> historyPage = chatMessageService.getMessagesByRoom(roomId, pageable);
                        
                        List<ChatMessageResponse> history = historyPage.getContent().stream().collect(Collectors.toList());
                        Collections.reverse(history);

                        List<ChatMessageBody> chatHistory = history.stream()
                                .map(msg -> new ChatMessageBody(
                                        msg.getSenderId().equals(senderId) ? "user" : "assistant",
                                        msg.getContent()))
                                .collect(Collectors.toList());

                        // Call Python gRPC
                        String aiResponseText = grpcClientService.callChatWithAIAsync(
                                token,
                                senderId.toString(),
                                message.getContent(),
                                chatHistory
                        ).get();

                        // 4. Save AI Response
                        ChatMessageRequest aiMessageRequest = ChatMessageRequest.builder()
                                .roomId(roomId)
                                .senderId(null)
                                .content(aiResponseText)
                                .messageType(messageRequest.getMessageType())
                                .purpose(RoomPurpose.AI_CHAT)
                                .receiverId(senderId)
                                .isRead(false)
                                .isDeleted(false)
                                .build();

                        ChatMessageResponse aiResponse = chatMessageService.saveMessage(roomId, aiMessageRequest);

                        // 5. Broadcast AI Response to User via WebSocket
                        messagingTemplate.convertAndSendToUser(senderId.toString(), "/queue/messages", aiResponse);

                    } catch (Exception e) {
                        log.error("AI Chat processing failed for room {}: {}", roomId, e.getMessage());
                    }
                }, Executors.newCachedThreadPool());
            }

            // Auto Translate Logic
            if (messageRequest.isRoomAutoTranslate() && room.getPurpose() != RoomPurpose.AI_CHAT) {
                String targetLang = "vi"; 
                CompletableFuture.runAsync(() -> {
                    try {
                        learning.TranslateResponse tr = grpcClientService.callTranslateAsync(token, message.getContent(), "", targetLang).get();
                        if (tr != null && tr.getError().isEmpty()) {
                            chatMessageService.saveTranslation(message.getChatMessageId(), targetLang, tr.getTranslatedText());
                            TranslationEvent evt = new TranslationEvent();
                            evt.setMessageId(message.getChatMessageId());
                            evt.setTargetLang(targetLang);
                            evt.setTranslatedText(tr.getTranslatedText());
                            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/translations", evt);
                        }
                    } catch (Exception e) {
                        log.error("Translation async failed: {}", e.getMessage());
                    }
                }, Executors.newCachedThreadPool());
            }

        } catch (Exception e) {
            log.error("CRITICAL ERROR in sendMessage: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/chat/message/{messageId}/react")
    public void reactToMessage (
            @DestinationVariable UUID messageId,
            @Payload String reaction,
            Principal principal){
        UUID userId = getUserIdFromPrincipal(principal);
        if (userId != null) {
            ChatMessageResponse updatedMessage = chatMessageService.addReaction(messageId, reaction, userId);
            messagingTemplate.convertAndSend("/topic/room/" + updatedMessage.getRoomId(), updatedMessage);
        }
    }

    @MessageMapping("/chat/message/{messageId}/read")
    public void markMessageAsRead (
            @DestinationVariable UUID messageId,
            Principal principal){
        UUID userId = getUserIdFromPrincipal(principal);
        if (userId != null) {
            ChatMessageResponse updatedMessage = chatMessageService.markAsRead(messageId, userId);
            messagingTemplate.convertAndSend("/topic/room/" + updatedMessage.getRoomId(), updatedMessage);
        }
    }

    @MessageMapping("/chat/room/{roomId}/typing")
    public void handleTypingStatus (
            @DestinationVariable UUID roomId,
            @Payload TypingStatusRequest request,
            Principal principal){
        
        UUID userId = getUserIdFromPrincipal(principal);
        if (userId == null) return;

        request.setUserId(userId);
        chatMessageService.handleTypingStatus(roomId, request);
        
        // Đoạn này lấy room từ DB, cần try-catch nếu room không tồn tại
        try {
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            
            if (room.getPurpose() == RoomPurpose.PRIVATE_CHAT) {
                roomMemberRepository.findAllByIdRoomIdAndIsDeletedFalse(roomId).stream()
                        .map(RoomMember::getId)
                        .map(RoomMemberId::getUserId)
                        .filter(uid -> !uid.equals(request.getUserId()))
                        .forEach(uid ->
                                messagingTemplate.convertAndSendToUser(
                                        uid.toString(), "/queue/typing", request));
            } else if (room.getPurpose() == RoomPurpose.GROUP_CHAT) {
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/typing", request);
            } else if (room.getPurpose() == RoomPurpose.AI_CHAT) {
                 messagingTemplate.convertAndSendToUser(request.getUserId().toString(), "/queue/typing", request);
            }
        } catch (Exception e) {
            log.warn("Typing status error: {}", e.getMessage());
        }
    }
    
    @MessageMapping("/chat/room/{roomId}/status")
    public void handleUserStatus(
            @DestinationVariable UUID roomId,
            @Payload UserStatusRequest request,
            Principal principal) {
        UUID userId = getUserIdFromPrincipal(principal);
        if (userId != null) {
            request.setUserId(userId);
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/status", request);
        }
    }

    private String extractToken (String authorization, SimpMessageHeaderAccessor headerAccessor){
        String authToken = headerAccessor.getFirstNativeHeader("X-Auth-Token");
        if (authToken != null && authToken.startsWith("Bearer ")) {
            return authToken.substring(7);
        }

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7);
    }

    private void sendPushNotification(UUID senderId, UUID receiverId, Room room, String messageContent) {
        if (receiverId == null) return;

        User sender = userRepository.findByUserIdAndIsDeletedFalse(senderId)
                .orElse(null);
        String senderName = (sender != null && sender.getFullname() != null) ? sender.getFullname() : "Tin nhắn mới";

        String title = (room.getPurpose() == RoomPurpose.PRIVATE_CHAT) ? senderName : room.getRoomName();
        String payload = String.format("{\"screen\":\"Chat\", \"stackScreen\":\"ChatDetail\", \"chatId\":\"%s\"}", room.getRoomId());

        NotificationRequest notificationRequest = NotificationRequest.builder()
                .userId(receiverId)
                .title(title)
                .content(messageContent)
                .type(NotificationType.MESSAGE.name())
                .payload(payload)
                .build();

        try {
            notificationService.createPushNotification(notificationRequest);
        } catch (Exception e) {
            log.error("Failed to send push notification for message to user {}: {}", receiverId, e.getMessage());
        }
    }
}