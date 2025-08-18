package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.ChatMessageBody;
import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TypingStatusRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.entity.RoomMember;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.RoomMemberRepository;
import com.connectJPA.LinguaVietnameseApp.repository.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {
    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageSource messageSource;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GrpcClientService grpcClientService;
    private final AuthenticationService authenticationService;

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

    @Operation(summary = "Delete a chat message", description = "Soft delete a chat message by ID")
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

    @MessageMapping("/chat/room/{roomId}")
    public void sendMessage(
            @DestinationVariable UUID roomId,
            @Payload ChatMessageRequest messageRequest,
            Principal principal,
            @RequestHeader("Authorization") String authorization) {
        String token = extractToken(authorization);
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
        if (message.getPurpose() == RoomPurpose.PRIVATE_CHAT) {
            messagingTemplate.convertAndSendToUser(
                    message.getSenderId().toString(), "/queue/messages", message);
            messagingTemplate.convertAndSendToUser(
                    message.getReceiverId().toString(), "/queue/messages", message);
        } else if (message.getPurpose() == RoomPurpose.GROUP_CHAT) {
            messagingTemplate.convertAndSend("/topic/room/" + roomId, message);
        } else if (message.getPurpose() == RoomPurpose.AI_CHAT) {
            messagingTemplate.convertAndSendToUser(
                    message.getSenderId().toString(), "/queue/messages", message);

            // Retrieve chat history from chat_messages
            Pageable pageable = PageRequest.of(0, 10); // Last 10 messages
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
                            msg.isDeleted(),
                            msg.getSentAt(),
                            msg.getUpdatedAt(),
                            msg.getDeletedAt()))
                    .toList();

            try {
                // Call gRPC ChatWithAI service
                String aiResponseText = grpcClientService.callChatWithAIAsync(
                        token,
                        senderId.toString(),
                        message.getContent(),
                        history.stream()
                                .map(msg -> new ChatMessageBody(msg.getSenderId().equals(senderId) ? "user" : "assistant", msg.getContent()))
                                .collect(Collectors.toList())
                ).get();

                // Save AI response to chat_messages
                ChatMessageRequest aiMessageRequest = ChatMessageRequest.builder()
                        .roomId(roomId)
                        .senderId(null) // AI has no user_id
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
        }
    }

    @MessageMapping("/chat/message/{messageId}/react")
    public void reactToMessage(
            @DestinationVariable UUID messageId,
            @Payload String reaction,
            Principal principal) {
        ChatMessageResponse updatedMessage = chatMessageService.addReaction(messageId, reaction, UUID.fromString(principal.getName()));
        messagingTemplate.convertAndSend("/topic/room/" + updatedMessage.getRoomId(), updatedMessage);
    }

    @MessageMapping("/chat/message/{messageId}/read")
    public void markMessageAsRead(
            @DestinationVariable UUID messageId,
            Principal principal) {
        ChatMessageResponse updatedMessage = chatMessageService.markAsRead(messageId, UUID.fromString(principal.getName()));
        messagingTemplate.convertAndSend("/topic/room/" + updatedMessage.getRoomId(), updatedMessage);
    }

    @MessageMapping("/chat/room/{roomId}/typing")
    public void handleTypingStatus(
            @DestinationVariable UUID roomId,
            @Payload TypingStatusRequest request,
            Principal principal) {
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

    private String extractToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return authorization.substring(7);
    }
}