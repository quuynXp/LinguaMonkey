package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.ChatMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ChatMessageMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "translations", ignore = true)
    @Mapping(source = "content", target = "content")
    @Mapping(source = "mediaUrl", target = "mediaUrl")
    @Mapping(source = "messageType", target = "messageType")
    @Mapping(source = "senderId", target = "senderId")
    @Mapping(source = "receiverId", target = "receiverId")
    @Mapping(source = "roomId", target = "roomId")
    
    @Mapping(source = "senderEphemeralKey", target = "senderEphemeralKey")
    @Mapping(source = "usedPreKeyId", target = "usedPreKeyId")
    @Mapping(source = "initializationVector", target = "initializationVector")
    @Mapping(source = "selfContent", target = "selfContent")
    @Mapping(source = "selfEphemeralKey", target = "selfEphemeralKey")
    @Mapping(source = "selfInitializationVector", target = "selfInitializationVector")
    
    @Mapping(target = "isDeleted", constant = "false")
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    ChatMessage toEntity(ChatMessageRequest request);

    @Mapping(source = "id.chatMessageId", target = "chatMessageId")
    @Mapping(source = "id.sentAt", target = "sentAt")
    @Mapping(source = "content", target = "content")
    @Mapping(source = "mediaUrl", target = "mediaUrl")
    @Mapping(source = "translations", target = "translations")
    
    @Mapping(source = "senderEphemeralKey", target = "senderEphemeralKey")
    @Mapping(source = "usedPreKeyId", target = "usedPreKeyId")
    @Mapping(source = "initializationVector", target = "initializationVector")
    @Mapping(source = "selfContent", target = "selfContent")
    @Mapping(source = "selfEphemeralKey", target = "selfEphemeralKey")
    @Mapping(source = "selfInitializationVector", target = "selfInitializationVector")
    ChatMessageResponse toResponse(ChatMessage message);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "translations", ignore = true)
    void updateEntityFromRequest(ChatMessageRequest request, @MappingTarget ChatMessage message);
}