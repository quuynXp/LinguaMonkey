package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TypingStatusRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatStatsResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserProfileResponse;
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

import learning.TranslateResponse;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

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
    private final Gson gson = new Gson();

    @Lazy
    private final DailyChallengeService dailyChallengeService;
    @Lazy
    private final BadgeService badgeService;

    // UUID cố định cho AI Bot, đồng bộ với Python và Mobile
    private static final UUID AI_BOT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

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

        // Logic check member: Bỏ qua nếu là AI Bot gửi tin
        boolean isAiBot = AI_BOT_ID.equals(request.getSenderId());
        
        if (!isAiBot && room.getPurpose() != RoomPurpose.AI_CHAT) {
            UUID currentUserId = request.getSenderId();
            if(!roomMemberRepository.existsById_RoomIdAndId_UserIdAndIsDeletedFalse(roomId, currentUserId)){
                throw new AppException(ErrorCode.NOT_ROOM_MEMBER);
            }
        }

        ChatMessage message = chatMessageMapper.toEntity(request);
        if (message.getId() == null) {
            message.setId(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()));
        }
        message.setRoomId(roomId);
        message.setSenderId(request.getSenderId());

        // === LOGIC DỊCH THÔNG MINH (EAGER TRANSLATION) ===
        // Chỉ dịch tin nhắn TEXT
        if (request.getContent() != null && !request.getContent().isEmpty() 
            && (request.getMessageType() == null || request.getMessageType().name().equals("TEXT"))) {
            
            String targetLang = "en"; // Default fallback
            boolean shouldTranslate = false;

            // 1. Xác định ngôn ngữ mục tiêu dựa trên người nhận
            if (room.getPurpose() == RoomPurpose.PRIVATE_CHAT) {
                UUID receiverId = request.getReceiverId(); 
                if (receiverId == null) {
                      // Fallback tìm member còn lại
                      receiverId = roomMemberRepository.findOtherMemberId(roomId, request.getSenderId());
                }
                
                if (receiverId != null) {
                    User receiver = userRepository.findById(receiverId).orElse(null);
                    // Lấy ngôn ngữ mẹ đẻ của người nhận làm ngôn ngữ đích
                    if (receiver != null && receiver.getNativeLanguageCode() != null) {
                        targetLang = receiver.getNativeLanguageCode();
                        shouldTranslate = true;
                    }
                }
            } else {
                // Với Group Chat, có thể mặc định dịch sang tiếng Anh hoặc Việt
                targetLang = "vi"; 
                // shouldTranslate = true; // Uncomment để bật dịch cho Group
            }

            if (shouldTranslate) {
                try {
                    // Gọi Python để Detect & Translate
                    // Truyền "auto" để Python tự detect source language
                    CompletableFuture<TranslateResponse> future = grpcClientService.callTranslateAsync(
                        null, // Internal call, no token needed if handled by interceptor logic or trusted network
                        request.getContent(), 
                        "auto", 
                        targetLang
                    );
                    
                    TranslateResponse aiResponse = future.join(); // Sync wait (gRPC fast enough)
                    
                    String detectedSource = aiResponse.getSourceLanguageDetected();
                    String translatedText = aiResponse.getTranslatedText();
                    
                    // 2. Logic kiểm tra: Chỉ lưu nếu ngôn ngữ gốc KHÁC ngôn ngữ đích
                    if (detectedSource != null && !detectedSource.equalsIgnoreCase(targetLang)) {
                        message.setTranslatedText(translatedText);
                        message.setTranslatedLang(targetLang);
                    } else {
                        // Cùng ngôn ngữ -> Không cần lưu bản dịch
                        message.setTranslatedText(null); 
                        message.setTranslatedLang(null);
                    }
                    
                } catch (Exception e) {
                    log.error("Auto-translation failed, saving original only: {}", e.getMessage());
                }
            }
        }
        
        ChatMessage savedMessage = chatMessageRepository.save(message);

        room.setUpdatedAt(OffsetDateTime.now());
        roomRepository.save(room);

        // --- UPDATE CHALLENGES AND BADGES (Only for real users) ---
        if (!isAiBot) {
            try {
                // 1. Badge Update (Message Count)
                if (badgeService != null) {
                    badgeService.updateBadgeProgress(request.getSenderId(), BadgeType.MESSAGE_COUNT, 1);
                }
    
                // 2. Daily Challenge Update
                if (dailyChallengeService != null) {
                    dailyChallengeService.updateChallengeProgress(request.getSenderId(), ChallengeType.VOCABULARY_REVIEW, 1);
                }
            } catch (Exception e) {
                log.warn("Failed to update challenge/badge progress for message: {}", e.getMessage());
            }
        }

        ChatMessageResponse response = chatMessageMapper.toResponse(savedMessage);
        response.setPurpose(room.getPurpose());

        // Handle Sender Profile: If AI, return null or dummy, else fetch user
        if (isAiBot) {
            response.setSenderProfile(null); 
        } else {
            UserProfileResponse senderProfile = userService.getUserProfile(null, savedMessage.getSenderId());
            response.setSenderProfile(senderProfile);
        }

        try {
            messagingTemplate.convertAndSend("/topic/room/" + roomId, response);

            List<UUID> memberIds = roomMemberRepository.findAllById_RoomIdAndIsDeletedFalse(roomId)
                .stream()
                .map(rm -> rm.getId().getUserId())
                .filter(u -> !u.equals(request.getSenderId()))
                .toList();

            for (UUID uId : memberIds) {
                try {
                    messagingTemplate.convertAndSendToUser(
                        uId.toString(), 
                        "/queue/notifications", 
                        response
                    );
                } catch (Exception wsEx) {
                    log.warn("Failed to send private WS notification to user {}", uId);
                }

                try {
                    Map<String, String> dataPayload = Map.of(
                        "screen", "TabApp",
                        "stackScreen", "GroupChatScreen",
                        "roomId", roomId.toString(),
                        "initialFocusMessageId", response.getChatMessageId().toString()
                    );
                    String payloadJson = gson.toJson(dataPayload);

                    NotificationRequest nreq = NotificationRequest.builder()
                            .userId(uId)
                            .title("New message")
                            .content(response.getContent() != null ? response.getContent() : "You sent an attachment")
                            .type("CHAT_MESSAGE")
                            .payload(payloadJson)
                            .build();

                    notificationService.createPushNotification(nreq);
                } catch (Exception pushEx) {
                    log.error("Failed to create push notification for user {}: {}", uId, pushEx.getMessage());
                }
            }
            log.info("Processed message delivery for room {}", roomId);
        } catch (Exception e) {
            log.error("Failed to process message delivery logic", e);
        }

        return response;
    }

    @Override
    public Page<ChatMessageResponse> getMessagesByRoom(UUID roomId, Pageable pageable) {
        return chatMessageRepository.findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(roomId, pageable)
                .map(chatMessageMapper::toResponse);
    }

    @Override
    @Transactional
    public ChatMessageResponse saveMessageInternal(UUID roomId, ChatMessageRequest request) {
        // Redirect to main save logic to reuse AI UUID checking
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
            if (minutesSinceSent > 5) {
                throw new AppException(ErrorCode.MESSAGE_EDIT_EXPIRED); 
            }

            chatMessageRepository.softDeleteByChatMessageId(id);
            messageReactionRepository.softDeleteByChatMessageId(id);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error while deleting message ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public ChatMessageResponse editChatMessage(UUID messageId, String newContent) {
        try {
            ChatMessage message = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(messageId)
                    .orElseThrow(() -> new AppException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));

            String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!message.getSenderId().toString().equals(currentUserId)) {
                throw new AppException(ErrorCode.NOT_ROOM_CREATOR);
            }

            long minutesSinceSent = ChronoUnit.MINUTES.between(message.getId().getSentAt(), OffsetDateTime.now());
            if (minutesSinceSent > 5) {
                throw new AppException(ErrorCode.MESSAGE_EDIT_EXPIRED);
            }

            message.setContent(newContent);
            message.setUpdatedAt(OffsetDateTime.now());
            message = chatMessageRepository.save(message);

            ChatMessageResponse response = chatMessageMapper.toResponse(message);
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            response.setPurpose(room.getPurpose());
            
            return response;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error while editing message ID {}: {}", messageId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
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
                    .reactionId(UUID.randomUUID())
                    .chatMessageId(messageId)
                    .sentAt(OffsetDateTime.now())
                    .userId(userId)
                    .reaction(reaction)
                    .build();
            messageReactionRepository.save(messageReaction);
            ChatMessageResponse response = chatMessageMapper.toResponse(message);
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            response.setPurpose(room.getPurpose());
            return response;
        } catch (Exception e) {
            log.error("Error while adding reaction to message ID {}: {}", messageId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
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
            
            ChatMessageResponse response = chatMessageMapper.toResponse(message);
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            response.setPurpose(room.getPurpose());
            return response;
        } catch (Exception e) {
            log.error("Error while marking message ID {} as read: {}", messageId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public ChatMessageResponse generateAIResponse(ChatMessageResponse userMessage) {
        try {
            // FIXED: Use standardized AI_BOT_ID instead of randomUUID
            ChatMessage aiMessage = ChatMessage.builder()
                    .id(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()))
                    .roomId(userMessage.getRoomId())
                    .senderId(AI_BOT_ID) 
                    .content("AI response to: " + userMessage.getContent())
                    .messageType(userMessage.getMessageType())
                    .isRead(false)
                    .build();
            aiMessage = chatMessageRepository.save(aiMessage);
            ChatMessageResponse response = chatMessageMapper.toResponse(aiMessage);
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(userMessage.getRoomId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            response.setPurpose(room.getPurpose());
            return response;
        } catch (Exception e) {
            log.error("Error while generating AI response for message ID {}: {}", userMessage.getChatMessageId(), e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
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
        } catch (Exception e) {
            log.error("Error while handling typing status for room ID {}: {}", roomId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public ChatStatsResponse getStatsByUser(UUID userId) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        long totalMessages = chatMessageRepository.countBySenderIdAndIsDeletedFalse(userId);
        long totalTranslations = chatMessageRepository.countTranslationsForUser(userId);
        long totalRooms = roomMemberRepository.countByIdUserIdAndIsDeletedFalse(userId);

        return ChatStatsResponse.builder()
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
    }

    @Override
    @Transactional
    public ChatMessageResponse saveTranslation(UUID messageId, String targetLang, String translatedText) {
        try {
            ChatMessage message = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(messageId)
                    .orElseThrow(() -> new AppException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));

            MessageTranslation mt = MessageTranslation.builder()
                    .chatMessageId(messageId)
                    .targetLang(targetLang)
                    .translatedText(translatedText)
                    .build();

            messageTranslationRepository.save(mt);

            ChatMessageResponse response = chatMessageMapper.toResponse(message);
            response.setPurpose(roomRepository.findByRoomIdAndIsDeletedFalse(message.getRoomId()).orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND)).getPurpose());

            response.setTranslatedText(translatedText);
            response.setTranslatedLang(targetLang);
            return response;
        } catch (Exception e) {
            log.error("Error saving translation for message {}", messageId, e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}