package com.connectJPA.LinguaVietnameseApp.service.elasticsearch;

import com.connectJPA.LinguaVietnameseApp.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationSearchService {
    private final ElasticSearchService elasticSearchService;
    private static final List<String> SEARCH_FIELDS = List.of("title", "content", "payload");

    public Page<Notification> searchNotifications(String keyword, int page, int size, Map<String,Object> filters){
        return elasticSearchService.search(Notification.class, keyword, SEARCH_FIELDS, filters, page, size);
    }

    public void indexNotification(Notification notification) { elasticSearchService.index(notification); }
    public void deleteNotification(Notification notification) { elasticSearchService.delete(notification); }
}
