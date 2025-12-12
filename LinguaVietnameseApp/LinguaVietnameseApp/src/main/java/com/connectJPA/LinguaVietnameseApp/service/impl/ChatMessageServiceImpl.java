package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TypingStatusRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatStatsResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.ChatMessagesId;
import com.connectJPA.LinguaVietnameseApp.enums.BadgeType;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.ChatMessageMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import com.google.gson.Gson;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageServiceImpl implements ChatMessageService {
    private final ChatMessageRepository chatMessageRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final ChatMessageMapper chatMessageMapper;
    private final UserRepository userRepository;
    private final MessageTranslationRepository messageTranslationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final GrpcClientService grpcClientService;
    private final UserService userService;
    
    // Gson vẫn giữ lại chỉ để dùng cho Notification Payload, không dùng cho translation nữa
    private final Gson gson = new Gson();

    @Lazy
    private final DailyChallengeService dailyChallengeService;
    @Lazy
    private final BadgeService badgeService;

    private static final UUID AI_BOT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    // --- ĐÃ XÓA: parseTranslations và serializeTranslations (vì Entity giờ là Map) ---

    private ChatMessageResponse mapToResponse(ChatMessage entity, RoomPurpose purpose) {
        ChatMessageResponse response = chatMessageMapper.toResponse(entity);
        // Entity.translations bây giờ là Map, Response.translations cũng là Map
        // MapStruct đã tự map, nhưng nếu cần override thủ công:
        response.setTranslations(entity.getTranslations()); 
        response.setPurpose(purpose);
        return response;
    }

    @Override
    public Page<ChatMessage> searchMessages(String keyword, UUID roomId, int page, int size) {
        if (keyword == null || keyword.isBlank()) {
            return Page.empty();
        }
        try {
            Pageable pageable = PageRequest.of(page, size);
            return chatMessageRepository.searchMessagesByKeyword(keyword, roomId, pageable);
        } catch (Exception e) {
            log.error("Error while searching messages with keyword: {}", keyword, e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public ChatMessageResponse saveMessage(UUID roomId, ChatMessageRequest request) {
        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        boolean isAiBot = AI_BOT_ID.equals(request.getSenderId());
        
        if (!isAiBot && room.getPurpose() != RoomPurpose.AI_CHAT) {
            UUID currentUserId = request.getSenderId();
            if(!roomMemberRepository.existsById_RoomIdAndId_UserIdAndIsDeletedFalse(roomId, currentUserId)){
                throw new AppException(ErrorCode.NOT_ROOM_MEMBER);
            }
        }

        ChatMessage message = chatMessageMapper.toEntity(request);
        if (request.getMediaUrl() != null && !request.getMediaUrl().isEmpty()) {
            message.setMediaUrl(request.getMediaUrl());
        }
        
        if (message.getId() == null) {
            message.setId(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()));
        }
        message.setRoomId(roomId);
        message.setSenderId(request.getSenderId());
        
        // FIX: Khởi tạo Map rỗng thay vì String "{}"
        message.setTranslations(new HashMap<>());

        ChatMessage savedMessage = chatMessageRepository.save(message);
        room.setUpdatedAt(OffsetDateTime.now());
        roomRepository.save(room);

        if (!isAiBot) {
            try {
                if (badgeService != null) badgeService.updateBadgeProgress(request.getSenderId(), BadgeType.MESSAGE_COUNT, 1);
                if (dailyChallengeService != null) dailyChallengeService.updateChallengeProgress(request.getSenderId(), ChallengeType.VOCABULARY_REVIEW, 1);
            } catch (Exception e) { log.warn("Stats update failed", e); }
        }

        ChatMessageResponse response = mapToResponse(savedMessage, room.getPurpose());
        
        if (isAiBot) response.setSenderProfile(null); 
        else response.setSenderProfile(userService.getUserProfile(null, savedMessage.getSenderId()));

        try {
            messagingTemplate.convertAndSend("/topic/room/" + roomId, response);
            
            List<UUID> memberIds = roomMemberRepository.findAllById_RoomIdAndIsDeletedFalse(roomId)
                .stream().map(rm -> rm.getId().getUserId()).filter(u -> !u.equals(request.getSenderId())).toList();

            for (UUID uId : memberIds) {
                try {
                    messagingTemplate.convertAndSendToUser(uId.toString(), "/queue/notifications", response);
                } catch (Exception wsEx) { log.warn("Failed to send private WS notification to user {}", uId); }

                try {
                    Map<String, String> dataPayload = Map.of(
                        "screen", "TabApp", "stackScreen", "GroupChatScreen",
                        "roomId", roomId.toString(), "initialFocusMessageId", response.getChatMessageId().toString()
                    );
                    // Gson vẫn dùng để serialize payload cho Notification (String)
                    String payloadJson = gson.toJson(dataPayload);
                    NotificationRequest nreq = NotificationRequest.builder().userId(uId).title("New message").content(response.getContent() != null ? response.getContent() : "You sent an attachment").type("CHAT_MESSAGE").payload(payloadJson).build();
                    notificationService.createPushNotification(nreq);
                } catch (Exception pushEx) { log.error("Failed to create push notification for user {}", uId); }
            }
        } catch (Exception e) { log.error("Delivery failed", e); }

        return response;
    }

    @Override
    public Page<ChatMessageResponse> getMessagesByRoom(UUID roomId, Pageable pageable) {
        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId).orElse(null);
        RoomPurpose purpose = room != null ? room.getPurpose() : RoomPurpose.GROUP_CHAT;
        
        return chatMessageRepository.findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(roomId, pageable)
                .map(entity -> mapToResponse(entity, purpose));
    }

    @Override
    @Transactional
    public ChatMessageResponse saveMessageInternal(UUID roomId, ChatMessageRequest request) {
        return this.saveMessage(roomId, request);
    }

    @Override
    @Transactional
    public void deleteChatMessage(UUID id) {
        try {
            ChatMessage message = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));
            String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!message.getSenderId().toString().equals(currentUserId)) {
                throw new AppException(ErrorCode.NOT_ROOM_CREATOR);
            }
            long minutesSinceSent = ChronoUnit.MINUTES.between(message.getId().getSentAt(), OffsetDateTime.now());
            if (minutesSinceSent > 5) throw new AppException(ErrorCode.MESSAGE_EDIT_EXPIRED); 

            chatMessageRepository.softDeleteByChatMessageId(id);
            messageReactionRepository.softDeleteByChatMessageId(id);
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION); }
    }

    @Override
    @Transactional
    public ChatMessageResponse editChatMessage(UUID messageId, String newContent) {
        try {
            ChatMessage message = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(messageId)
                    .orElseThrow(() -> new AppException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));
            String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!message.getSenderId().toString().equals(currentUserId)) throw new AppException(ErrorCode.NOT_ROOM_CREATOR);
            long minutesSinceSent = ChronoUnit.MINUTES.between(message.getId().getSentAt(), OffsetDateTime.now());
            if (minutesSinceSent > 5) throw new AppException(ErrorCode.MESSAGE_EDIT_EXPIRED);

            message.setContent(newContent);
            
            // FIX: Reset về Map rỗng khi edit (logic cũ là reset về "{}")
            message.setTranslations(new HashMap<>()); 
            
            message.setUpdatedAt(OffsetDateTime.now());
            message = chatMessageRepository.save(message);

            ChatMessageResponse response = mapToResponse(message, null);
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            response.setPurpose(room.getPurpose());
            return response;
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION); }
    }

    @Override
    @Transactional
    public ChatMessageResponse addReaction(UUID messageId, String reaction, UUID userId) {
        try {
            ChatMessage message = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(messageId)
                    .orElseThrow(() -> new AppException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));
            roomMemberRepository.findByIdRoomIdAndIdUserIdAndIsDeletedFalse(message.getRoomId(), userId)
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_ROOM_MEMBER));
            MessageReaction messageReaction = MessageReaction.builder()
                    .reactionId(UUID.randomUUID()).chatMessageId(messageId).sentAt(OffsetDateTime.now()).userId(userId).reaction(reaction).build();
            messageReactionRepository.save(messageReaction);
            
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            return mapToResponse(message, room.getPurpose());
        } catch (Exception e) { throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION); }
    }

    @Override
    @Transactional
    public ChatMessageResponse markAsRead(UUID messageId, UUID userId) {
        try {
            ChatMessage message = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(messageId)
                    .orElseThrow(() -> new AppException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));
            roomMemberRepository.findByIdRoomIdAndIdUserIdAndIsDeletedFalse(message.getRoomId(), userId)
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_ROOM_MEMBER));
            if (!message.isRead()) {
                message.setRead(true);
                message = chatMessageRepository.save(message);
            }
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            return mapToResponse(message, room.getPurpose());
        } catch (Exception e) { throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION); }
    }

    @Override
    @Transactional
    public ChatMessageResponse generateAIResponse(ChatMessageResponse userMessage) {
        try {
            ChatMessage aiMessage = ChatMessage.builder()
                    .id(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()))
                    .roomId(userMessage.getRoomId()).senderId(AI_BOT_ID)
                    .content("AI response to: " + userMessage.getContent())
                    .messageType(userMessage.getMessageType()).isRead(false)
                    // FIX: Khởi tạo Map rỗng
                    .translations(new HashMap<>()) 
                    .build();
            aiMessage = chatMessageRepository.save(aiMessage);
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(userMessage.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            return mapToResponse(aiMessage, room.getPurpose());
        } catch (Exception e) { throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION); }
    }

    @Override
    public void handleTypingStatus(UUID roomId, TypingStatusRequest request) {
        try {
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            if (room.getPurpose() != RoomPurpose.AI_CHAT) {
                roomMemberRepository.findByIdRoomIdAndIdUserIdAndIsDeletedFalse(roomId, request.getUserId())
                        .orElseThrow(() -> new AppException(ErrorCode.NOT_ROOM_MEMBER));
            }
        } catch (Exception e) { throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION); }
    }

    @Override
    public ChatStatsResponse getStatsByUser(UUID userId) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        long totalMessages = chatMessageRepository.countBySenderIdAndIsDeletedFalse(userId);
        long totalTranslations = chatMessageRepository.countTranslationsForUser(userId);
        long totalRooms = roomMemberRepository.countByIdUserIdAndIsDeletedFalse(userId);
        return ChatStatsResponse.builder().totalMessages(totalMessages).translationsUsed(totalTranslations).joinedRooms(totalRooms).videoCalls(0).lastActiveAt(user.getLastActiveAt()).online(user.isOnline()).level(user.getLevel()).exp(user.getExp()).streak(user.getStreak()).build();
    }

    @Override
    @Transactional
    public ChatMessageResponse saveTranslation(UUID messageId, String targetLang, String translatedText) {
        try {
            ChatMessage message = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(messageId)
                    .orElseThrow(() -> new AppException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));

            // --- FIX LOGIC: Thao tác trực tiếp với Map ---
            Map<String, String> translations = message.getTranslations();
            if (translations == null) {
                translations = new HashMap<>();
            }
            
            // Put trực tiếp vào Map
            translations.put(targetLang, translatedText);
            
            // Set lại Map vào entity (JPA sẽ tự lo việc convert sang JSONB)
            message.setTranslations(translations);
            
            ChatMessage saved = chatMessageRepository.save(message);

            MessageTranslation mt = MessageTranslation.builder()
                    .chatMessageId(messageId)
                    .targetLang(targetLang)
                    .translatedText(translatedText)
                    .build();
            messageTranslationRepository.save(mt);

            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

            ChatMessageResponse response = mapToResponse(saved, room.getPurpose());
            messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), response);

            return response;
        } catch (Exception e) {
            log.error("Error saving translation for message {}", messageId, e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    } 
}