package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TypingStatusRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatStatsResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.ChatMessagesId;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.ChatMessageMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
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

    @Override
    public Page<ChatMessageResponse> getMessagesByRoom(UUID roomId, Pageable pageable) {
        try {
            if (roomId == null || pageable == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Page<ChatMessage> messages = chatMessageRepository.findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(roomId, pageable);
            return messages.map(message -> {
                ChatMessageResponse response = chatMessageMapper.toResponse(message);
                Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                        .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
                response.setPurpose(room.getPurpose());
                return response;
            });
        } catch (Exception e) {
            log.error("Error while fetching messages for room ID {}: {}", roomId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
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
        try {
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

            if (room.getPurpose() != request.getPurpose()) {
                throw new AppException(ErrorCode.ROOM_PURPOSE_MISMATCH);
            }

            if (room.getPurpose() != RoomPurpose.AI_CHAT) {
                String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
                roomMemberRepository.findByIdRoomIdAndIdUserIdAndIsDeletedFalse(roomId, UUID.fromString(currentUserId))
                        .orElseThrow(() -> new AppException(ErrorCode.NOT_ROOM_MEMBER));
            }

            return saveMessageInternal(roomId, request);

        } catch (Exception e) {
            log.error("Error while saving message for room ID {}: {}", roomId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public ChatMessageResponse saveMessageInternal(UUID roomId, ChatMessageRequest request) {
        try {
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

            ChatMessage message = chatMessageMapper.toEntity(request);
            message.setRoomId(roomId);
            message.setSenderId(request.getSenderId());

            message = chatMessageRepository.save(message);
            ChatMessageResponse response = chatMessageMapper.toResponse(message);
            response.setPurpose(room.getPurpose());
            return response;
        } catch (Exception e) {
            log.error("Error during internal saveMessage for room ID {}: {}", roomId, e.getMessage());
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
            chatMessageRepository.softDeleteByChatMessageId(id);
            messageReactionRepository.softDeleteByChatMessageId(id);
        } catch (Exception e) {
            log.error("Error while deleting message ID {}: {}", id, e.getMessage());
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
            message.setRead(true);
            message = chatMessageRepository.save(message);
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
            ChatMessage aiMessage = ChatMessage.builder()
                    .id(new ChatMessagesId(UUID.randomUUID(), OffsetDateTime.now()))
                    .roomId(userMessage.getRoomId())
                    .senderId(UUID.randomUUID()) // AI user ID
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

        // Note: videoCalls is set to 0 as VideoCall entity is not yet implemented in Schema
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