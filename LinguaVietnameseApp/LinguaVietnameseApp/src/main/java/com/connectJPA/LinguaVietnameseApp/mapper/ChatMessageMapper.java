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

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "translations", ignore = true) // Ignore khi tạo mới, Service sẽ set "{}"
    public abstract ChatMessage toEntity(ChatMessageRequest request);

    @Mapping(source = "id.chatMessageId", target = "chatMessageId")
    @Mapping(source = "id.sentAt", target = "sentAt")
    @Mapping(target = "translations", expression = "java(mapTranslations(message.getTranslations()))")
    public abstract ChatMessageResponse toResponse(ChatMessage message);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "translations", ignore = true)
    public abstract void updateEntityFromRequest(ChatMessageRequest request, @MappingTarget ChatMessage message);

    // Helper method để convert JSON String -> Map
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