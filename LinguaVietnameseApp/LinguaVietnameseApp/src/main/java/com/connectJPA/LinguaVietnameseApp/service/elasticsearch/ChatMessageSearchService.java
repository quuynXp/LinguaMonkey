package com.connectJPA.LinguaVietnameseApp.service.elasticsearch;

import com.connectJPA.LinguaVietnameseApp.entity.ChatMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatMessageSearchService {

    private final ElasticSearchService elasticSearchService;

    private static final List<String> SEARCH_FIELDS = List.of("content");

    public Page<ChatMessage> searchMessages(String keyword, UUID roomId, int page, int size) {
        
        Map<String, Object> filters = new HashMap<>();
        
        filters.put("isDeleted", false); 

        if (roomId != null) {
            filters.put("roomId", roomId);
        }

        return elasticSearchService.search(
                ChatMessage.class, // Tìm trong index của ChatMessageDocument
                keyword,                   // Từ khóa tìm kiếm
                SEARCH_FIELDS,             // Tìm từ khóa trong các trường này (chỉ 'content')
                filters,                   // Áp dụng các bộ lọc (isDeleted, roomId)
                page,
                size
        );
    }

    public void indexMessage(ChatMessage messageDocument) {
        elasticSearchService.index(messageDocument);
    }

    public void deleteMessage(ChatMessage messageDocument) {
        elasticSearchService.delete(messageDocument);
    }
}