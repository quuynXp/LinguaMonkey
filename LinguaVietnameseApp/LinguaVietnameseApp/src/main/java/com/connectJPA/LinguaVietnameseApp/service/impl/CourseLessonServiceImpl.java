package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseLessonResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseLesson;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseLessonMapper;
import com.connectJPA.LinguaVietnameseApp.repository.CourseLessonRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseLessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourseLessonServiceImpl implements CourseLessonService {
    private final CourseLessonRepository courseLessonRepository;
    private final CourseLessonMapper courseLessonMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    @Cacheable(value = "courseLessons", key = "#courseId + ':' + #lessonId + ':' + #pageable")
    public Page<CourseLessonResponse> getAllCourseLessons(UUID courseId, UUID lessonId, Pageable pageable) {
        try {
            Page<CourseLesson> lessons = courseLessonRepository.findAllByIdCourseIdAndIdLessonIdAndIsDeletedFalse(courseId, lessonId, pageable);
            return lessons.map(courseLessonMapper::toResponse);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "courseLesson", key = "#courseId + ':' + #lessonId")
    public CourseLessonResponse getCourseLessonByIds(UUID courseId, UUID lessonId) {
        try {
            CourseLesson lesson = courseLessonRepository.findByIdCourseIdAndIdLessonIdAndIsDeletedFalse(courseId, lessonId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_LESSON_NOT_FOUND));
            return courseLessonMapper.toResponse(lesson);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"courseLessons"}, allEntries = true)
    public CourseLessonResponse createCourseLesson(CourseLessonRequest request) {
        try {
            CourseLesson lesson = courseLessonMapper.toEntity(request);
            lesson = courseLessonRepository.save(lesson);
            return courseLessonMapper.toResponse(lesson);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "courseLesson", key = "#courseId + ':' + #lessonId")
    public CourseLessonResponse updateCourseLesson(UUID courseId, UUID lessonId, CourseLessonRequest request) {
        try {
            CourseLesson lesson = courseLessonRepository.findByIdCourseIdAndIdLessonIdAndIsDeletedFalse(courseId, lessonId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_LESSON_NOT_FOUND));
            courseLessonMapper.updateEntityFromRequest(request, lesson);
            lesson = courseLessonRepository.save(lesson);
            return courseLessonMapper.toResponse(lesson);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "courseLesson", key = "#courseId + ':' + #lessonId")
    public void deleteCourseLesson(UUID courseId, UUID lessonId) {
        try {
            CourseLesson lesson = courseLessonRepository.findByIdCourseIdAndIdLessonIdAndIsDeletedFalse(courseId, lessonId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_LESSON_NOT_FOUND));
            lesson.setDeleted(true);
            courseLessonRepository.save(lesson);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}