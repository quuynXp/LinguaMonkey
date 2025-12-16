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
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.ChatMessageMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import com.connectJPA.LinguaVietnameseApp.utils.AESUtils;
import com.google.gson.Gson;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

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
    private final UserService userService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final GrpcClientService grpcClientService;
    private final AESUtils aesUtils;
    private final Gson gson = new Gson();

    @Lazy
    private final DailyChallengeService dailyChallengeService;
    @Lazy
    private final BadgeService badgeService;

    private static final UUID AI_BOT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

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
    @Caching(evict = {
        @CacheEvict(value = "room_messages", allEntries = true),
        @CacheEvict(value = "user_statistics", key = "#request.senderId")
    })
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
            if (message.getMessageType() == MessageType.IMAGE) message.setContent("📷 [Hình ảnh]"); 
            else if (message.getMessageType() == MessageType.VIDEO) message.setContent("🎥 [Video]");
            else if (message.getMessageType() == MessageType.AUDIO) message.setContent("🎤 [Audio]");
            else if (message.getMessageType() == MessageType.DOCUMENT) message.setContent("📄 [Tài liệu]");
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
            
            if (room.getPurpose() != RoomPurpose.PRIVATE_CHAT) {
                triggerGroupAsyncTranslation(savedMessage, room);
            }
            
            notifyMembers(savedMessage, room, response, request.getSenderId());
        } catch (Exception e) {
            log.error("Broadcast failed", e);
        }

        return response;
    }

    private void triggerGroupAsyncTranslation(ChatMessage message, Room room) {
        if (message.getMessageType() != MessageType.TEXT) return;
        
        String roomKey = room.getSecretKey();
        if (roomKey == null || roomKey.isEmpty()) {
            log.warn("Translation Skipped: No Room Key for Room {}", room.getRoomId());
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                String decryptedContent = aesUtils.decrypt(message.getContent(), roomKey);
                
                if (decryptedContent == null || decryptedContent.isEmpty()) {
                    log.error("Async Translate: Decryption FAILED for message {}. Ciphertext or Key invalid.", message.getId().getChatMessageId());
                    return;
                }
                
                if (decryptedContent.contains("ciphertext")) {
                      log.warn("Async Translate: Decrypted content looks like JSON/Ciphertext wrapper. Skipping.");
                      return;
                }

                log.info("Async Translate: Decryption success. Length: {}", decryptedContent.length());

                List<RoomMember> members = roomMemberRepository.findAllByIdRoomIdAndIsDeletedFalse(room.getRoomId());
                Set<String> targetLangs = members.stream()
                    .map(m -> userRepository.findById(m.getId().getUserId()).orElse(null))
                    .filter(Objects::nonNull)
                    .map(User::getNativeLanguageCode)
                    .filter(l -> l != null && !l.isEmpty()) 
                    .collect(Collectors.toSet());

                if (targetLangs.isEmpty()) return;

                Map<String, String> existingTranslations = message.getTranslations();
                if (existingTranslations != null) {
                    targetLangs.removeIf(existingTranslations::containsKey);
                }
                if (targetLangs.isEmpty()) return;

                Map<String, String> newTranslations = new HashMap<>();
                List<CompletableFuture<Void>> futures = new ArrayList<>();

                for (String lang : targetLangs) {
                    futures.add(grpcClientService.callTranslateAsync("", decryptedContent, "auto", lang)
                        .thenAccept(res -> {
                            if (res != null && res.getError().isEmpty()) {
                                synchronized (newTranslations) {
                                    newTranslations.put(lang, res.getTranslatedText());
                                }
                            } else {
                                log.warn("gRPC Translation failed for lang: {}", lang);
                            }
                        }));
                }

                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

                if (!newTranslations.isEmpty()) {
                    chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(message.getId().getChatMessageId()).ifPresent(msg -> {
                        Map<String, String> current = msg.getTranslations();
                        if (current == null) current = new HashMap<>();
                        
                        for (Map.Entry<String, String> entry : newTranslations.entrySet()) {
                            String encryptedTrans = aesUtils.encrypt(entry.getValue(), roomKey);
                            current.put(entry.getKey(), encryptedTrans);
                        }
                        
                        msg.setTranslations(current);
                        chatMessageRepository.save(msg);
                        
                        Map<String, Object> updateEvent = new HashMap<>();
                        updateEvent.put("type", "TRANSLATION_UPDATE");
                        updateEvent.put("id", message.getId().getChatMessageId().toString());
                        updateEvent.put("roomId", msg.getRoomId().toString());
                        updateEvent.put("translations", current);
                        
                        messagingTemplate.convertAndSend("/topic/room/" + msg.getRoomId(), updateEvent);
                        log.info("Async Translate: Updated {} translations for message {}", newTranslations.size(), message.getId().getChatMessageId());
                    });
                }
            } catch (Exception e) {
                log.error("Async Translation Critical Error", e);
            }
        });
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
                dataPayload.put("content", "🔒 Tin nhắn mới");
                
                if (savedMessage.getSenderEphemeralKey() != null) {
                    dataPayload.put("senderEphemeralKey", savedMessage.getSenderEphemeralKey());
                    dataPayload.put("initializationVector", savedMessage.getInitializationVector());
                }
                
                String payloadJson = gson.toJson(dataPayload);
                NotificationRequest nreq = NotificationRequest.builder()
                    .userId(uId)
                    .title("Tin nhắn mới")
                    .content("Bạn có tin nhắn mới")
                    .type("CHAT_MESSAGE")
                    .payload(payloadJson)
                    .build();
                notificationService.createPushNotification(nreq);
            } catch (Exception pushEx) { log.error("Failed to create push notification", pushEx); }
        }
    }

    @Override
    @Cacheable(value = "room_messages", key = "{#roomId, #pageable.pageNumber, #pageable.pageSize}")
    public Page<ChatMessageResponse> getMessagesByRoom(UUID roomId, Pageable pageable) {
        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId).orElse(null);
        RoomPurpose purpose = room != null ? room.getPurpose() : RoomPurpose.GROUP_CHAT;
        return chatMessageRepository.findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(roomId, pageable)
                .map(entity -> mapToResponse(entity, purpose));
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "room_messages", allEntries = true),
        @CacheEvict(value = "user_statistics", key = "#request.senderId")
    })
    public ChatMessageResponse saveMessageInternal(UUID roomId, ChatMessageRequest request) {
        return this.saveMessage(roomId, request);
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "room_messages", allEntries = true),
        @CacheEvict(value = "user_statistics", allEntries = true)
    })
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
    @CacheEvict(value = "room_messages", allEntries = true)
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
                triggerGroupAsyncTranslation(message, room);
            }

            return response;
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION); }
    }

    @Override
    @Transactional
    @CacheEvict(value = "room_messages", allEntries = true)
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
    @CacheEvict(value = "room_messages", allEntries = true)
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
    @CacheEvict(value = "room_messages", allEntries = true)
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
    @Cacheable(value = "user_statistics", key = "#userId")
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
        return null; 
    } 
}