package com.connectJPA.LinguaVietnameseApp.repository.elasticsearch;

import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.UUID;

public interface LessonSearchRepository  extends ElasticsearchRepository<Lesson, UUID> {
}
