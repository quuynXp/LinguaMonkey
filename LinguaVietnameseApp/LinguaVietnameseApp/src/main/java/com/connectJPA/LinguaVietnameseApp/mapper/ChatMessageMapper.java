package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.ChatMessage;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ChatMessageMapper {
    ChatMessage toEntity(ChatMessageRequest request);
    ChatMessageResponse toResponse(ChatMessage message);
    void updateEntityFromRequest(ChatMessageRequest request, @MappingTarget ChatMessage message);
}