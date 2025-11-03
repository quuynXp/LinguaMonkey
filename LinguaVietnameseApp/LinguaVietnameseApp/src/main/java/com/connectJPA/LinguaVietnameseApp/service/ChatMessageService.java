package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TypingStatusRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatStatsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ChatMessageService {
    Page<ChatMessageResponse> getMessagesByRoom(UUID roomId, Pageable pageable);
    ChatMessageResponse saveMessage(UUID roomId, ChatMessageRequest request);
    void deleteChatMessage(UUID id);
    ChatMessageResponse addReaction(UUID messageId, String reaction, UUID userId);
    ChatMessageResponse markAsRead(UUID messageId, UUID userId);
    ChatMessageResponse generateAIResponse(ChatMessageResponse userMessage);
    void handleTypingStatus(UUID roomId, TypingStatusRequest request);
    ChatStatsResponse getStatsByUser(UUID userId);
    ChatMessageResponse saveTranslation(UUID messageId, String targetLang, String translatedText);


}