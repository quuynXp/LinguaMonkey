package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.QuizResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface LessonService {
    Page<LessonResponse> getAllLessons(String lessonName, String languageCode, Integer minExpReward,
                                       UUID categoryId, UUID subCategoryId, UUID courseId, UUID seriesId, SkillType skillType,
                                       Pageable pageable);

    Map<String, Object> startTest(UUID lessonId, UUID userId);
    Map<String, Object> submitTest(UUID lessonId, UUID userId, Map<String,Object> payload);

    QuizResponse generateSoloQuiz(String token, UUID userId);

    QuizResponse generateTeamQuiz(String token, String topic);

    List<Lesson> getLessonsByIds(List<UUID> ids);
    Page<Lesson> getLessonsByCreator(UUID creatorId, Pageable pageable);
    LessonResponse getLessonById(UUID id);
    LessonResponse createLesson(LessonRequest request);
    LessonResponse updateLesson(UUID id, LessonRequest request);
    void deleteLesson(UUID id);
    void completeLesson(UUID lessonId, UUID userId, Integer score);
    Page<LessonResponse> getLessonsBySkillType(SkillType skillType, Pageable pageable);
    Page<LessonResponse> getLessonsByCertificateOrTopic(UUID categoryId, UUID subCategoryId, Pageable pageable);
}