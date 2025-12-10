package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.ChatMessageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ChatMessageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.ChatMessage;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Autowired;

import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;

@Mapper(componentModel = "spring")
public abstract class ChatMessageMapper {

    @Autowired
    protected Gson gson;

    // --- SỬA ĐỔI: Thêm mapping tường minh cho mediaUrl và messageType ---
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "translations", ignore = true)
    @Mapping(source = "mediaUrl", target = "mediaUrl") // Bắt buộc map
    @Mapping(source = "messageType", target = "messageType") // Bắt buộc map
    public abstract ChatMessage toEntity(ChatMessageRequest request);

    @Mapping(source = "id.chatMessageId", target = "chatMessageId")
    @Mapping(source = "id.sentAt", target = "sentAt")
    @Mapping(target = "translations", expression = "java(mapTranslations(message.getTranslations()))")
    @Mapping(source = "mediaUrl", target = "mediaUrl") // Bắt buộc map chiều về
    public abstract ChatMessageResponse toResponse(ChatMessage message);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "translations", ignore = true)
    public abstract void updateEntityFromRequest(ChatMessageRequest request, @MappingTarget ChatMessage message);

    protected Map<String, String> mapTranslations(String json) {
        if (json == null || json.isEmpty()) {
            return new HashMap<>();
        }
        try {
            Type type = new TypeToken<Map<String, String>>(){}.getType();
            return gson.fromJson(json, type);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}