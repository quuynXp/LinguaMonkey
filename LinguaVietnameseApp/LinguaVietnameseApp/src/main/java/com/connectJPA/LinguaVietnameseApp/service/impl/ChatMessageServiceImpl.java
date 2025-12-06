package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.ChatMessageBody;
import com.connectJPA.LinguaVietnameseApp.dto.TranslationEvent;
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
import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import com.connectJPA.LinguaVietnameseApp.enums.NotificationType;
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
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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
    private final GrpcClientService grpcClientService;
    private final UserService userService;
    
    // Executor separate from Main Thread to ensure Async Translation
    private final ExecutorService asyncExecutor = Executors.newCachedThreadPool();

    @Lazy
    private final DailyChallengeService dailyChallengeService;
    @Lazy
    private final BadgeService badgeService;

    // ... [Giữ nguyên searchMessages] ...
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
        log.info("Saving message to DB for room: {}", roomId); // LOG 1

        // 1. Validate Room & Member
        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getPurpose() != RoomPurpose.AI_CHAT && request.getSenderId() != null) {
            // Chỉ check member nếu không phải AI chat và sender tồn tại
            if (!roomMemberRepository.existsById_RoomIdAndId_UserIdAndIsDeletedFalse(roomId, request.getSenderId())) {
                log.error("User {} is not member of room {}", request.getSenderId(), roomId);
                throw new AppException(ErrorCode.NOT_ROOM_MEMBER);
            }
        }

        // 2. Save Original Message to DB
        ChatMessage message = chatMessageMapper.toEntity(request);
        if (message.getId() == null) {
            message.setId(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()));
        }
        message.setRoomId(roomId);
        message.setSenderId(request.getSenderId());
        
        ChatMessage savedMessage = chatMessageRepository.save(message); // ĐIỂM QUAN TRỌNG: Lưu tại đây
        room.setUpdatedAt(OffsetDateTime.now());
        roomRepository.save(room);

        log.info("Message saved to DB: {}", savedMessage.getId().getChatMessageId()); // LOG 2

        // 3. Broadcast Original Message Immediately (Realtime)
        ChatMessageResponse response = chatMessageMapper.toResponse(savedMessage);
        response.setPurpose(room.getPurpose());
        try {
            if (savedMessage.getSenderId() != null) {
                 UserProfileResponse senderProfile = userService.getUserProfile(null, savedMessage.getSenderId());
                 response.setSenderProfile(senderProfile);
            }
        } catch (Exception e) {
            log.warn("Error fetching profile for socket: {}", e.getMessage());
        }

        // 4. Handle Async Tasks (Translate, AI, Notification) - KHÔNG BLOCK TRANSACTION CHÍNH
        handleAsyncTasks(savedMessage, room, request);

        return response;
    }

    private void handleAsyncTasks(ChatMessage savedMessage, Room room, ChatMessageRequest request) {
        final UUID senderId = request.getSenderId();
        final String content = request.getContent();
        final boolean isAutoTranslate = request.isRoomAutoTranslate();
        final UUID roomId = room.getRoomId();
        
        // Capture token for AI context (nếu có)
        String token = "";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getCredentials() != null) {
            token = auth.getCredentials().toString();
        }
        final String finalToken = token;

        // Chạy trên luồng riêng, không ảnh hưởng transaction saveMessage
        CompletableFuture.runAsync(() -> {
            try {
                // A. Update Stats
                if (senderId != null) {
                    if (badgeService != null) badgeService.updateBadgeProgress(senderId, BadgeType.MESSAGE_COUNT, 1);
                    if (dailyChallengeService != null) dailyChallengeService.updateChallengeProgress(senderId, ChallengeType.VOCABULARY_REVIEW, 1);
                }

                // B. Notification (Skip for AI Chat)
                if (room.getPurpose() != RoomPurpose.AI_CHAT && senderId != null) {
                    handlePushNotification(savedMessage, room, senderId);
                }

                // C. Auto Translate (Separate Flow)
                if (content != null && !content.isEmpty() && isAutoTranslate && room.getPurpose() != RoomPurpose.AI_CHAT) {
                    handleAsyncTranslation(roomId, savedMessage.getId().getChatMessageId(), content, senderId, request.getReceiverId());
                }

                // D. AI Reply handled in Controller for better flow control, OR here if pure service logic
                if (room.getPurpose() == RoomPurpose.AI_CHAT) {
                    triggerAiReply(roomId, senderId, content, finalToken, room);
                }
            } catch (Exception e) {
                log.error("Async task error: {}", e.getMessage());
            }
        }, asyncExecutor);
    }
    
    // ... [Giữ nguyên các method private khác: handlePushNotification, handleAsyncTranslation, triggerAiReply...]
    
     private void handlePushNotification(ChatMessage message, Room room, UUID senderId) {
        try {
            List<UUID> receiverIds = new ArrayList<>();
            if (room.getPurpose() == RoomPurpose.PRIVATE_CHAT) {
                UUID otherMemberId = roomMemberRepository.findOtherMemberId(room.getRoomId(), senderId);
                if (otherMemberId != null) receiverIds.add(otherMemberId);
            } else if (room.getPurpose() == RoomPurpose.GROUP_CHAT) {
                List<RoomMember> members = roomMemberRepository.findAllByIdRoomIdAndIsDeletedFalse(room.getRoomId());
                for (RoomMember member : members) {
                    if (!member.getId().getUserId().equals(senderId)) {
                        receiverIds.add(member.getId().getUserId());
                    }
                }
            }

            User sender = userRepository.findById(senderId).orElse(null);
            String senderName = (sender != null) ? sender.getFullname() : "Someone";
            String title = (room.getPurpose() == RoomPurpose.GROUP_CHAT) ? room.getRoomName() : senderName;
            String body = (room.getPurpose() == RoomPurpose.GROUP_CHAT) ? (senderName + ": " + message.getContent()) : message.getContent();
            String payload = String.format("{\"screen\":\"Chat\", \"stackScreen\":\"ChatDetail\", \"chatId\":\"%s\"}", room.getRoomId());

            for (UUID receiverId : receiverIds) {
                NotificationRequest notifReq = NotificationRequest.builder()
                        .userId(receiverId)
                        .title(title)
                        .content(body)
                        .type(NotificationType.MESSAGE.name())
                        .payload(payload)
                        .build();
                notificationService.createPushNotification(notifReq);
            }
        } catch (Exception e) {
            log.error("Failed to send push notification: {}", e.getMessage());
        }
    }

    private void handleAsyncTranslation(UUID roomId, UUID msgId, String content, UUID senderId, UUID receiverId) {
        try {
            String targetLang = "vi"; 
            UUID targetUserId = receiverId;
            if (targetUserId == null) targetUserId = roomMemberRepository.findOtherMemberId(roomId, senderId);
            
            if (targetUserId != null) {
                User receiver = userRepository.findById(targetUserId).orElse(null);
                if (receiver != null && receiver.getNativeLanguageCode() != null) targetLang = receiver.getNativeLanguageCode();
            }

            TranslateResponse tr = grpcClientService.callTranslateAsync(null, content, "auto", targetLang).join();

            if (tr != null && tr.getTranslatedText() != null) {
                ChatMessage msg = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(msgId).orElse(null);
                if (msg != null) {
                    msg.setTranslatedText(tr.getTranslatedText());
                    msg.setTranslatedLang(targetLang);
                    chatMessageRepository.save(msg);
                }
                
                TranslationEvent evt = new TranslationEvent(msgId, targetLang, tr.getTranslatedText());
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/translations", evt);
            }
        } catch (Exception e) {
            log.error("Translation async failed: {}", e.getMessage());
        }
    }

    private void triggerAiReply(UUID roomId, UUID userId, String content, String token, Room room) {
        try {
            Pageable pageable = PageRequest.of(0, 10, Sort.by("id.sentAt").descending());
            List<ChatMessage> history = chatMessageRepository.findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(roomId, pageable).getContent();
            List<ChatMessage> sortedHistory = new ArrayList<>(history);
            Collections.reverse(sortedHistory);
            
            List<ChatMessageBody> historyDtos = sortedHistory.stream()
                .map(m -> new ChatMessageBody(m.getSenderId() == null ? "model" : "user", m.getContent()))
                .collect(Collectors.toList());

            String aiResponse = grpcClientService.callChatWithAIAsync(token, userId != null ? userId.toString() : "user", content, historyDtos).join();
            
            if (aiResponse != null && !aiResponse.isEmpty()) {
                ChatMessage aiMsg = ChatMessage.builder()
                        .id(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()))
                        .roomId(roomId).senderId(null).content(aiResponse)
                        .messageType(MessageType.TEXT).isRead(false).isDeleted(false).build();
                chatMessageRepository.save(aiMsg);
                
                ChatMessageResponse response = chatMessageMapper.toResponse(aiMsg);
                response.setPurpose(RoomPurpose.AI_CHAT);
                UserProfileResponse aiProfile = new UserProfileResponse();
                aiProfile.setFullname("AI Assistant");
                aiProfile.setAvatarUrl("https://cdn-icons-png.flaticon.com/512/4712/4712027.png");
                response.setSenderProfile(aiProfile);
                
                messagingTemplate.convertAndSend("/topic/room/" + roomId, response);
            }
        } catch (Exception e) {
            log.error("AI Reply failed: {}", e.getMessage());
        }
    }
    
    // ... [Giữ nguyên các method khác] ...
     @Override
    public Page<ChatMessageResponse> getMessagesByRoom(UUID roomId, Pageable pageable) {
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("id.sentAt").descending());
        return chatMessageRepository.findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(roomId, sorted)
                .map(msg -> {
                    ChatMessageResponse res = chatMessageMapper.toResponse(msg);
                    if (msg.getSenderId() == null) {
                         UserProfileResponse aiProfile = new UserProfileResponse();
                         aiProfile.setFullname("AI Assistant");
                         aiProfile.setAvatarUrl("https://cdn-icons-png.flaticon.com/512/4712/4712027.png");
                         res.setSenderProfile(aiProfile);
                    } else {
                        try { res.setSenderProfile(userService.getUserProfile(null, msg.getSenderId())); } catch (Exception e) {}
                    }
                    return res;
                });
    }

    @Override
    @Transactional
    public ChatMessageResponse saveMessageInternal(UUID roomId, ChatMessageRequest request) {
          try {
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            ChatMessage message = chatMessageMapper.toEntity(request);
            if (message.getId() == null) {
                message.setId(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()));
            }
            message.setRoomId(roomId);
            message.setSenderId(request.getSenderId());
            message = chatMessageRepository.save(message);
            ChatMessageResponse response = chatMessageMapper.toResponse(message);
            response.setPurpose(room.getPurpose());
            return response;
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
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
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public ChatMessageResponse generateAIResponse(ChatMessageResponse userMessage) {
         return null;
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
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}