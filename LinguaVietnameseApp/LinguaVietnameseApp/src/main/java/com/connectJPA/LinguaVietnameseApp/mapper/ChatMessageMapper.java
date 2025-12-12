package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.ChatMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;


import java.util.Map;

@Mapper(componentModel = "spring")
public abstract class ChatMessageMapper {


    @Mapping(target = "id", ignore = true)
    @Mapping(target = "translations", ignore = true) // Entity nhận Map, MapStruct sẽ lo việc tạo Map rỗng
    @Mapping(source = "mediaUrl", target = "mediaUrl")
    @Mapping(source = "messageType", target = "messageType")
    public abstract ChatMessage toEntity(ChatMessageRequest request);

    @Mapping(source = "id.chatMessageId", target = "chatMessageId")
    @Mapping(source = "id.sentAt", target = "sentAt")
    
    // FIX: Loại bỏ expression tùy chỉnh và để MapStruct tự map Map<String, String> -> Map<String, String>
    @Mapping(source = "translations", target = "translations") 
    
    @Mapping(source = "mediaUrl", target = "mediaUrl")
    public abstract ChatMessageResponse toResponse(ChatMessage message);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "translations", ignore = true)
    public abstract void updateEntityFromRequest(ChatMessageRequest request, @MappingTarget ChatMessage message);

}