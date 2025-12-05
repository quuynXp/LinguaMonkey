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
    private final Gson gson = new Gson();

    @Lazy
    private final DailyChallengeService dailyChallengeService;
    @Lazy
    private final BadgeService badgeService;

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
        // 1. Validate Room & Member
        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getPurpose() != RoomPurpose.AI_CHAT) {
            UUID currentUserId = request.getSenderId();
            if (!roomMemberRepository.existsById_RoomIdAndId_UserIdAndIsDeletedFalse(roomId, currentUserId)) {
                throw new AppException(ErrorCode.NOT_ROOM_MEMBER);
            }
        }

        // 2. Tạo Entity (Chưa dịch)
        ChatMessage message = chatMessageMapper.toEntity(request);
        if (message.getId() == null) {
            message.setId(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()));
        }
        message.setRoomId(roomId);
        message.setSenderId(request.getSenderId());
        
        // Mặc định null để save nhanh
        message.setTranslatedText(null);
        message.setTranslatedLang(null);

        // 3. Save DB & Update Room
        ChatMessage savedMessage = chatMessageRepository.save(message);
        room.setUpdatedAt(OffsetDateTime.now());
        roomRepository.save(room);

        // 4. Prepare Response & Send WebSocket (NGAY LẬP TỨC)
        ChatMessageResponse response = chatMessageMapper.toResponse(savedMessage);
        response.setPurpose(room.getPurpose());
        try {
            UserProfileResponse senderProfile = userService.getUserProfile(null, savedMessage.getSenderId());
            response.setSenderProfile(senderProfile);
        } catch (Exception e) {}

        try {
            messagingTemplate.convertAndSend("/topic/room/" + roomId, response);
        } catch (Exception e) {
            log.error("Socket send failed", e);
        }

        // =================================================================================
        // 5. ASYNC TASKS: Notification, Stats, Translation, AI (Chạy ngầm)
        // =================================================================================

        final UUID senderId = request.getSenderId();
        final String content = request.getContent();
        final boolean isAutoTranslate = request.isRoomAutoTranslate();
        // FIX LỖI Ở ĐÂY: Lấy UUID từ ChatMessagesId
        final UUID msgId = savedMessage.getId().getChatMessageId();
        
        // Lấy token nếu có (cho logic AI cần auth)
        String token = "";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getCredentials() != null) {
            token = auth.getCredentials().toString();
        }
        final String finalToken = token;

        CompletableFuture.runAsync(() -> {
            // A. Update Stats/Badges
            try {
                if (badgeService != null) badgeService.updateBadgeProgress(senderId, BadgeType.MESSAGE_COUNT, 1);
                if (dailyChallengeService != null) dailyChallengeService.updateChallengeProgress(senderId, ChallengeType.VOCABULARY_REVIEW, 1);
            } catch (Exception e) { log.warn("Stats update failed", e); }

            // B. Gửi Notification
            if (room.getPurpose() != RoomPurpose.AI_CHAT) {
                handlePushNotification(savedMessage, room, senderId);
            }

            // C. Auto Translate (Nếu bật)
            if (content != null && !content.isEmpty() && isAutoTranslate && room.getPurpose() != RoomPurpose.AI_CHAT) {
                handleAsyncTranslation(roomId, msgId, content, senderId, request.getReceiverId());
            }

            // D. AI Logic
            if (room.getPurpose() == RoomPurpose.AI_CHAT) {
                triggerAiReply(roomId, senderId, content, finalToken, room);
            }
        });

        return response;
    }

    // --- Helper: Xử lý Gửi Notification ---
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

            // Lấy tên người gửi
            User sender = userRepository.findById(senderId).orElse(null);
            String senderName = (sender != null) ? sender.getFullname() : "Someone";
            
            // Xây dựng title/body
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

    // --- Helper: Xử lý Dịch Async ---
    private void handleAsyncTranslation(UUID roomId, UUID msgId, String content, UUID senderId, UUID receiverId) {
        try {
            String targetLang = "vi"; 
            UUID targetUserId = receiverId;
            if (targetUserId == null) {
                targetUserId = roomMemberRepository.findOtherMemberId(roomId, senderId);
            }
            if (targetUserId != null) {
                User receiver = userRepository.findById(targetUserId).orElse(null);
                if (receiver != null && receiver.getNativeLanguageCode() != null) {
                    targetLang = receiver.getNativeLanguageCode();
                }
            }

            TranslateResponse tr = grpcClientService.callTranslateAsync(null, content, "auto", targetLang).join();

            if (tr != null && tr.getTranslatedText() != null && !tr.getTranslatedText().isEmpty()) {
                // Update DB
                ChatMessage msg = chatMessageRepository.findByIdChatMessageIdAndIsDeletedFalse(msgId).orElse(null);
                if (msg != null) {
                    msg.setTranslatedText(tr.getTranslatedText());
                    msg.setTranslatedLang(targetLang);
                    chatMessageRepository.save(msg);
                }

                // Gửi sự kiện Translation qua Socket
                TranslationEvent evt = new TranslationEvent();
                evt.setMessageId(msgId);
                evt.setTargetLang(targetLang);
                evt.setTranslatedText(tr.getTranslatedText());
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/translations", evt);
            }
        } catch (Exception e) {
            log.error("Async translation failed: {}", e.getMessage());
        }
    }

    // --- Helper: Xử lý AI Reply ---
    private void triggerAiReply(UUID roomId, UUID userId, String userMessageContent, String token, Room room) {
        try {
            Pageable pageable = PageRequest.of(0, 10, Sort.by("id.sentAt").descending());
            List<ChatMessage> historyEntities = chatMessageRepository.findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(roomId, pageable).getContent();
            List<ChatMessage> sortedHistory = new ArrayList<>(historyEntities);
            Collections.reverse(sortedHistory);

            List<ChatMessageBody> historyDtos = sortedHistory.stream().map(msg -> {
                String role = (msg.getSenderId() == null) ? "model" : "user";
                return new ChatMessageBody(role, msg.getContent());
            }).collect(Collectors.toList());

            String aiResponseText = grpcClientService.callChatWithAIAsync(token, userId.toString(), userMessageContent, historyDtos).join();

            if (aiResponseText != null && !aiResponseText.isEmpty()) {
                ChatMessage aiMessage = ChatMessage.builder()
                        .id(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()))
                        .roomId(roomId)
                        .senderId(null) // AI Sender
                        .content(aiResponseText)
                        .messageType(MessageType.TEXT)
                        .isRead(false)
                        .isDeleted(false)
                        .build();

                chatMessageRepository.save(aiMessage);

                // Socket
                ChatMessageResponse aiResponseDto = chatMessageMapper.toResponse(aiMessage);
                aiResponseDto.setPurpose(RoomPurpose.AI_CHAT);
                UserProfileResponse aiProfile = new UserProfileResponse();
                aiProfile.setUserId(null);
                aiProfile.setFullname("AI Assistant");
                aiProfile.setAvatarUrl("https://cdn-icons-png.flaticon.com/512/4712/4712027.png");
                aiResponseDto.setSenderProfile(aiProfile);

                messagingTemplate.convertAndSend("/topic/room/" + roomId, aiResponseDto);
                
                // Notification: AI Replied
                NotificationRequest notifReq = NotificationRequest.builder()
                        .userId(userId)
                        .title("AI Assistant")
                        .content(aiResponseText.length() > 50 ? aiResponseText.substring(0, 47) + "..." : aiResponseText)
                        .type(NotificationType.MESSAGE.name())
                        .payload(String.format("{\"screen\":\"Chat\", \"stackScreen\":\"ChatDetail\", \"chatId\":\"%s\"}", roomId))
                        .build();
                notificationService.createPushNotification(notifReq);
            }
        } catch (Exception e) {
            log.error("AI Reply failed: {}", e.getMessage());
        }
    }

    @Override
    public Page<ChatMessageResponse> getMessagesByRoom(UUID roomId, Pageable pageable) {
        return chatMessageRepository.findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(roomId, pageable)
                .map(msg -> {
                    ChatMessageResponse response = chatMessageMapper.toResponse(msg);
                    if (msg.getSenderId() == null) {
                        UserProfileResponse aiProfile = new UserProfileResponse();
                        aiProfile.setFullname("AI Assistant");
                        aiProfile.setAvatarUrl("https://cdn-icons-png.flaticon.com/512/4712/4712027.png");
                        response.setSenderProfile(aiProfile);
                    } else {
                        try {
                            response.setSenderProfile(userService.getUserProfile(null, msg.getSenderId()));
                        } catch (Exception e) {}
                    }
                    return response;
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