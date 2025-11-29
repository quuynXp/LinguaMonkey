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
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
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
        
        // Notify socket clients about the update
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
        String authorization = headerAccessor.getFirstNativeHeader("Authorization");
        String token = extractToken(authorization, headerAccessor);

        UUID senderId = UUID.fromString(principal.getName());
        messageRequest = ChatMessageRequest.builder()
                .roomId(roomId)
                .senderId(senderId)
                .content(messageRequest.getContent())
                .mediaUrl(messageRequest.getMediaUrl())
                .messageType(messageRequest.getMessageType())
                .purpose(messageRequest.getPurpose())
                .receiverId(messageRequest.getReceiverId())
                .isRead(messageRequest.isRead())
                .isDeleted(messageRequest.isDeleted())
                .build();

        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        ChatMessageResponse message = chatMessageService.saveMessage(roomId, messageRequest);

        UUID messageId = message.getChatMessageId();

        if (message.getPurpose() == RoomPurpose.PRIVATE_CHAT) {
            messagingTemplate.convertAndSendToUser(
                    message.getSenderId().toString(), "/queue/messages", message);
            messagingTemplate.convertAndSendToUser(
                    message.getReceiverId().toString(), "/queue/messages", message);

            sendPushNotification(senderId, message.getReceiverId(), room, message.getContent());
        } else if (message.getPurpose() == RoomPurpose.GROUP_CHAT) {
            messagingTemplate.convertAndSend("/topic/room/" + roomId, message);

            List<RoomMember> members = roomMemberRepository.findAllByIdRoomIdAndIsDeletedFalse(roomId);
            for (RoomMember member : members) {
                UUID memberId = member.getId().getUserId();
                if (!memberId.equals(senderId)) {
                    sendPushNotification(senderId, memberId, room, message.getContent());
                }
            }
        } else if (message.getPurpose() == RoomPurpose.AI_CHAT) {
            messagingTemplate.convertAndSendToUser(
                    message.getSenderId().toString(), "/queue/messages", message);

            Pageable pageable = PageRequest.of(0, 10);
            Page<ChatMessageResponse> historyPage = chatMessageService.getMessagesByRoom(roomId, pageable);
            List<ChatMessageResponse> history = historyPage.getContent().stream()
                    .map(msg -> new ChatMessageResponse(
                            msg.getChatMessageId(),
                            msg.getRoomId(),
                            msg.getSenderId(),
                            msg.getReceiverId(),
                            msg.getContent(),
                            msg.getMediaUrl(),
                            msg.getMessageType(),
                            msg.getPurpose(),
                            msg.isRead(),
                            msg.getTranslatedLang(),
                            msg.getTranslatedText(),
                            msg.isDeleted(),
                            msg.getSentAt(),
                            msg.getUpdatedAt(),
                            msg.getDeletedAt()))
                    .toList();

            try {
                String aiResponseText = grpcClientService.callChatWithAIAsync(
                        token,
                        senderId.toString(),
                        message.getContent(),
                        history.stream()
                                .map(msg -> new ChatMessageBody(msg.getSenderId().equals(senderId) ? "user" : "assistant", msg.getContent()))
                                .collect(Collectors.toList())
                ).get();

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
                messagingTemplate.convertAndSendToUser(
                        senderId.toString(), "/queue/messages", aiResponse);
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }

            if (messageRequest.isRoomAutoTranslate()) {
                String targetLang = "vi";
                CompletableFuture.runAsync(() -> {
                    try {
                        learning.TranslateResponse tr = grpcClientService.callTranslateAsync(token, message.getContent(), "", targetLang).get();

                        if (!tr.getError().isEmpty()) {
                            log.warn("Translate returned error: {}", tr.getError());
                            return;
                        }

                        ChatMessageResponse translatedResp = chatMessageService.saveTranslation(messageId, targetLang, tr.getTranslatedText());

                        TranslationEvent evt = new TranslationEvent();
                        evt.setMessageId(messageId);
                        evt.setTargetLang(targetLang);
                        evt.setTranslatedText(tr.getTranslatedText());

                        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/translations", evt);
                    } catch (Exception e) {
                        log.error("Translation async failed for message {}: {}", messageId, e.getMessage());
                    }
                }, Executors.newCachedThreadPool());
            }
        }
    }

    @MessageMapping("/chat/message/{messageId}/react")
    public void reactToMessage (
            @DestinationVariable UUID messageId,
            @Payload String reaction,
            Principal principal){
        ChatMessageResponse updatedMessage = chatMessageService.addReaction(messageId, reaction, UUID.fromString(principal.getName()));
        messagingTemplate.convertAndSend("/topic/room/" + updatedMessage.getRoomId(), updatedMessage);
    }

    @MessageMapping("/chat/message/{messageId}/read")
    public void markMessageAsRead (
            @DestinationVariable UUID messageId,
            Principal principal){
        ChatMessageResponse updatedMessage = chatMessageService.markAsRead(messageId, UUID.fromString(principal.getName()));
        // Broadcast the update so the sender sees the read status change
        messagingTemplate.convertAndSend("/topic/room/" + updatedMessage.getRoomId(), updatedMessage);
    }

    @MessageMapping("/chat/room/{roomId}/typing")
    public void handleTypingStatus (
            @DestinationVariable UUID roomId,
            @Payload TypingStatusRequest request,
            Principal principal){
        request.setUserId(UUID.fromString(principal.getName()));
        chatMessageService.handleTypingStatus(roomId, request);
        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        if (room.getPurpose() == RoomPurpose.PRIVATE_CHAT) {
            roomMemberRepository.findAllByIdRoomIdAndIsDeletedFalse(roomId).stream()
                    .map(RoomMember::getId)
                    .map(RoomMemberId::getUserId)
                    .filter(userId -> !userId.equals(request.getUserId()))
                    .forEach(userId ->
                            messagingTemplate.convertAndSendToUser(
                                    userId.toString(), "/queue/typing", request));
        } else if (room.getPurpose() == RoomPurpose.GROUP_CHAT) {
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/typing", request);
        } else if (room.getPurpose() == RoomPurpose.AI_CHAT) {
            messagingTemplate.convertAndSendToUser(
                    request.getUserId().toString(), "/queue/typing", request);
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