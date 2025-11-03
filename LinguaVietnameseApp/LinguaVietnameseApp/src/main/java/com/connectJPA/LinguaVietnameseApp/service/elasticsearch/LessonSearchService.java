package com.connectJPA.LinguaVietnameseApp.service.elasticsearch;

import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LessonSearchService {
    private final ElasticSearchService elasticSearchService;
    private static final List<String> SEARCH_FIELDS = List.of("lessonName", "title", "description");

    public Page<Lesson> searchLessons(String keyword, int page, int size, Map<String, Object> filters) {
        return elasticSearchService.search(Lesson.class, keyword, SEARCH_FIELDS, filters, page, size);
    }

    public void indexLesson(Lesson lesson) { elasticSearchService.index(lesson); }
    public void deleteLesson(Lesson lesson) { elasticSearchService.delete(lesson); }
}
