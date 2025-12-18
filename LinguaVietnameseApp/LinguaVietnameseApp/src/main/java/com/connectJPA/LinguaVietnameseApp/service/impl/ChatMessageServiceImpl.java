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
import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
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
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.TimeUnit;

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
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final UserService userService;
    
    private final StringRedisTemplate stringRedisTemplate; 
    private final RedisTemplate<String, Object> redisTemplate;
    
    private final Gson gson = new Gson();

    @Lazy
    private final DailyChallengeService dailyChallengeService;
    @Lazy
    private final BadgeService badgeService;

    private static final UUID AI_BOT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");
    private static final String USER_STATS_CACHE_PREFIX = "user_statistics::";
    private static final String TRANSLATION_QUEUE_KEY = "chat_translation_queue";

    private ChatMessageResponse mapToResponse(ChatMessage entity, RoomPurpose purpose) {
        ChatMessageResponse response = chatMessageMapper.toResponse(entity);
        response.setTranslations(entity.getTranslations());
        response.setPurpose(purpose);
        response.setMediaUrl(entity.getMediaUrl());
        response.setSenderEphemeralKey(entity.getSenderEphemeralKey());
        response.setUsedPreKeyId(entity.getUsedPreKeyId());
        response.setInitializationVector(entity.getInitializationVector());
        response.setSelfContent(entity.getSelfContent());
        response.setSelfEphemeralKey(entity.getSelfEphemeralKey());
        response.setSelfInitializationVector(entity.getSelfInitializationVector());
        return response;
    }

    @Override
    public Page<ChatMessage> searchMessages(String keyword, UUID roomId, int page, int size) {
        if (keyword == null || keyword.isBlank()) return Page.empty();
        try {
            Pageable pageable = PageRequest.of(page, size);
            return chatMessageRepository.searchMessagesByKeyword(keyword, roomId, pageable);
        } catch (Exception e) {
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
        message.setSenderEphemeralKey(request.getSenderEphemeralKey());
        message.setUsedPreKeyId(request.getUsedPreKeyId());
        message.setInitializationVector(request.getInitializationVector());
        message.setSelfContent(request.getSelfContent());
        message.setSelfEphemeralKey(request.getSelfEphemeralKey());
        message.setSelfInitializationVector(request.getSelfInitializationVector());
        
        if (request.getMediaUrl() != null && !request.getMediaUrl().isEmpty()) {
            message.setMediaUrl(request.getMediaUrl());
        }

        if (message.getContent() == null || message.getContent().trim().isEmpty()) {
            if (message.getMessageType() == MessageType.IMAGE) message.setContent("📷 [IMAGE]"); 
            else if (message.getMessageType() == MessageType.VIDEO) message.setContent("🎥 [VIDEO]");
            else if (message.getMessageType() == MessageType.AUDIO) message.setContent("🎤 [AUDIO]");
            else if (message.getMessageType() == MessageType.DOCUMENT) message.setContent("📄 [DOCUMENT]");
        }
        
        if (message.getId() == null) {
            message.setId(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()));
        }
        message.setRoomId(roomId);
        message.setSenderId(request.getSenderId());
        if (message.getTranslations() == null) {
            message.setTranslations(new HashMap<>());
        }
        message.setRead(false);

        ChatMessage savedMessage = chatMessageRepository.save(message);
        room.setUpdatedAt(OffsetDateTime.now());
        roomRepository.save(room);

        if (!isAiBot) {
            try {
                if (badgeService != null) badgeService.updateBadgeProgress(request.getSenderId(), BadgeType.MESSAGE_COUNT, 1);
                if (dailyChallengeService != null) dailyChallengeService.updateChallengeProgress(request.getSenderId(), ChallengeType.VOCABULARY_REVIEW, 1);
            } catch (Exception e) { log.warn("Stats update failed but ignored", e); }
        }

        ChatMessageResponse response = mapToResponse(savedMessage, room.getPurpose());
        if (isAiBot) response.setSenderProfile(null); 
        else response.setSenderProfile(userService.getUserProfile(null, savedMessage.getSenderId()));

        try {
            messagingTemplate.convertAndSend("/topic/room/" + roomId, response);
            
            if (room.getPurpose() != RoomPurpose.PRIVATE_CHAT && message.getMessageType() == MessageType.TEXT) {
                dispatchToPythonQueue(savedMessage);
            }
            
            notifyMembers(savedMessage, room, response, request.getSenderId());
        } catch (Exception e) {
            log.error("Broadcast/Dispatch failed", e);
        }

        try {
            redisTemplate.delete(USER_STATS_CACHE_PREFIX + request.getSenderId());
        } catch (Exception e) {
            log.warn("Failed to evict user stats cache", e);
        }

        return response;
    }

    private void dispatchToPythonQueue(ChatMessage message) {
        Map<String, Object> task = new HashMap<>();
        task.put("messageId", message.getId().getChatMessageId().toString());
        task.put("roomId", message.getRoomId().toString());
        task.put("content", message.getContent()); 
        task.put("senderId", message.getSenderId().toString());
        
        String jsonTask = gson.toJson(task);
        
        try {
            stringRedisTemplate.opsForList().leftPush(TRANSLATION_QUEUE_KEY, jsonTask);
            log.info(">>> [Java] Pushed to Queue: MsgId={}", message.getId().getChatMessageId());
        } catch (Exception e) {
            log.error("Failed to push translation task to Redis", e);
        }
    }

    private void notifyMembers(ChatMessage savedMessage, Room room, ChatMessageResponse response, UUID senderId) {
         List<UUID> memberIds = roomMemberRepository.findAllById_RoomIdAndIsDeletedFalse(room.getRoomId())
            .stream().map(rm -> rm.getId().getUserId()).filter(u -> !u.equals(senderId)).toList();

        Map<String, Object> event = new HashMap<>();
        event.put("type", "NEW_MESSAGE_EVENT");
        event.put("messageId", savedMessage.getId().getChatMessageId().toString());
        event.put("roomId", room.getRoomId().toString());
        event.put("content", savedMessage.getContent());
        event.put("senderId", savedMessage.getSenderId().toString());
        
        try {
            redisTemplate.convertAndSend("chat_events", event);
        } catch (Exception redisEx) {
            log.error("Redis publish failed", redisEx);
        }

        for (UUID uId : memberIds) {
            try {
                messagingTemplate.convertAndSendToUser(uId.toString(), "/queue/notifications", response);
            } catch (Exception wsEx) { log.warn("Failed to send private WS notification to user {}", uId); }

            try {
                Map<String, String> dataPayload = new HashMap<>();
                dataPayload.put("screen", "ChatStack"); 
                dataPayload.put("stackScreen", "GroupChatScreen"); 
                dataPayload.put("roomId", room.getRoomId().toString());
                dataPayload.put("initialFocusMessageId", response.getChatMessageId().toString());
                dataPayload.put("senderId", savedMessage.getSenderId().toString());
                dataPayload.put("isEncrypted", "true"); 
                
                // CRITICAL FIX: Send the ciphertext (content) to client for decryption
                dataPayload.put("ciphertext", savedMessage.getContent()); 

                if (room.getPurpose() == RoomPurpose.PRIVATE_CHAT) {
                    dataPayload.put("encryptionType", "PRIVATE"); // Signal Protocol
                    if (savedMessage.getSenderEphemeralKey() != null) {
                        dataPayload.put("senderEphemeralKey", savedMessage.getSenderEphemeralKey());
                        dataPayload.put("initializationVector", savedMessage.getInitializationVector());
                    }
                } else {
                    dataPayload.put("encryptionType", "GROUP"); // Room Key
                }
                
                String payloadJson = gson.toJson(dataPayload);
                NotificationRequest nreq = NotificationRequest.builder()
                    .userId(uId)
                    .title("MonkeyLingua") 
                    .content("Bạn có tin nhắn mới") // Fallback content if decrypt fails or background processing off
                    .type("CHAT_MESSAGE")
                    .payload(payloadJson)
                    .build();
                notificationService.createPushNotification(nreq);
            } catch (Exception pushEx) { log.error("Failed to create push notification", pushEx); }
        }
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

            redisTemplate.delete(USER_STATS_CACHE_PREFIX + message.getSenderId());

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
            message.setTranslations(new HashMap<>()); 
            
            message.setUpdatedAt(OffsetDateTime.now());
            message = chatMessageRepository.save(message);

            ChatMessageResponse response = mapToResponse(message, null);
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            response.setPurpose(room.getPurpose());
            
            if (room.getPurpose() != RoomPurpose.PRIVATE_CHAT) {
                dispatchToPythonQueue(message);
            }

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
        String cacheKey = USER_STATS_CACHE_PREFIX + userId;
        
        try {
            Object cachedData = redisTemplate.opsForValue().get(cacheKey);
            if (cachedData != null) {
                if (cachedData instanceof ChatStatsResponse) {
                    return (ChatStatsResponse) cachedData;
                } else if (cachedData instanceof LinkedHashMap) {
                    String json = gson.toJson(cachedData);
                    return gson.fromJson(json, ChatStatsResponse.class);
                }
            }
        } catch (Exception e) {
            log.warn("Redis cache fetch failed for user stats: {}", e.getMessage());
        }

        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        long totalMessages = chatMessageRepository.countBySenderIdAndIsDeletedFalse(userId);
        long totalTranslations = chatMessageRepository.countTranslationsForUser(userId);
        long totalRooms = roomMemberRepository.countByIdUserIdAndIsDeletedFalse(userId);
        
        ChatStatsResponse response = ChatStatsResponse.builder()
                .totalMessages(totalMessages)
                .translationsUsed(totalTranslations)
                .joinedRooms(totalRooms)
                .videoCalls(0)
                .lastActiveAt(user.getLastActiveAt())
                .online(user.isOnline())
                .level(user.getLevel())
                .exp(user.getExp())
                .streak(user.getStreak())
                .build();
        
        try {
            redisTemplate.opsForValue().set(cacheKey, response, 1, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("Redis cache set failed for user stats", e);
        }

        return response;
    }

    @Override
    @Transactional
    public ChatMessageResponse saveTranslation(UUID messageId, String targetLang, String translatedText) {
        return null; 
    } 
}