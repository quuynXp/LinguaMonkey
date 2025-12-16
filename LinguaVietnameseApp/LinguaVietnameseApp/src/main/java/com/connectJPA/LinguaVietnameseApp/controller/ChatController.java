package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TypingStatusRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatStatsResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.entity.RoomMember;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomMemberRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

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
    private final RedisTemplate<String, Object> redisTemplate;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UserStatusRequest {
        private UUID userId;
        private String status;
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
            @PageableDefault(size = 20, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable,
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
        return ResponseEntity.ok(AppApiResponse.<ChatStatsResponse>builder()
                .code(200)
                .message(messageSource.getMessage("chat.stats.success", null, locale))
                .result(stats)
                .build());
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
        
        log.info("📥 [STOMP] Received message for room: {}", roomId);

        UUID senderId = messageRequest.getSenderId();
        if (senderId == null) {
            log.error("❌ [STOMP] senderId is NULL in request!");
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        ChatMessageResponse message = chatMessageService.saveMessage(roomId, messageRequest);
        
        if (message.getPurpose() == RoomPurpose.AI_CHAT) {
             chatMessageService.generateAIResponse(message);
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
            @Payload Map<String, Object> payload, 
            Principal principal){
        
        UUID userId = UUID.fromString(principal.getName());
        ChatMessageResponse updatedMessage = chatMessageService.markAsRead(messageId, userId);
        
        if (updatedMessage != null) {
            messagingTemplate.convertAndSend("/topic/room/" + updatedMessage.getRoomId(), updatedMessage);
        }
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
    
    @MessageMapping("/chat/room/{roomId}/status")
    public void handleUserStatus(
            @DestinationVariable UUID roomId,
            @Payload UserStatusRequest request,
            Principal principal) {
        
        request.setUserId(UUID.fromString(principal.getName()));
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/status", request);
    }
}