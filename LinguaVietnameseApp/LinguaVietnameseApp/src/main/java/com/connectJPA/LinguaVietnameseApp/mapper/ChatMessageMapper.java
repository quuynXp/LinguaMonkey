package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.ChatMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ChatMessageMapper {

    @Mapping(target = "id", ignore = true) // Entity tự generate ID hoặc set trong logic service
    ChatMessage toEntity(ChatMessageRequest request);

    // FIX: Map từ EmbeddedId ra flat fields trong DTO
    @Mapping(source = "id.chatMessageId", target = "chatMessageId")
    @Mapping(source = "id.sentAt", target = "sentAt")
    ChatMessageResponse toResponse(ChatMessage message);

    @Mapping(target = "id", ignore = true)
    void updateEntityFromRequest(ChatMessageRequest request, @MappingTarget ChatMessage message);
}