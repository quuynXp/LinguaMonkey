package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonMapper;
import com.connectJPA.LinguaVietnameseApp.repository.*;
import com.connectJPA.LinguaVietnameseApp.service.LessonService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LessonServiceImpl implements LessonService {
    private final LessonRepository lessonRepository;
    private final LessonQuestionRepository lessonQuestionRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final UserRepository userRepository;
    private final VideoRepository videoRepository;
    private final LessonCategoryRepository lessonCategoryRepository;
    private final UserService userService;
    private final LessonSubCategoryRepository lessonSubCategoryRepository;
    private final LessonMapper lessonMapper;
    private final UserLearningActivityRepository userLearningActivityRepository;

    @Override
    @Cacheable(value = "lessons", key = "{#lessonName, #languageCode, #minExpReward, #categoryId, #subCategoryId, #courseId, #seriesId, #pageable.pageNumber, #pageable.pageSize, #pageable.sort}")
    public Page<LessonResponse> getAllLessons(String lessonName, String languageCode, Integer minExpReward,
                                              UUID categoryId, UUID subCategoryId, UUID courseId, UUID seriesId,
                                              Pageable pageable) {
        try {
            // Validate pagination
            if (pageable.getPageNumber() < 0 || pageable.getPageSize() <= 0) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }

            // Validate category and subcategory existence
            if (categoryId != null && !lessonCategoryRepository.existsById(categoryId)) {
                throw new AppException(ErrorCode.LESSON_CATEGORY_NOT_FOUND);
            }
            if (subCategoryId != null && !lessonSubCategoryRepository.existsById(subCategoryId)) {
                throw new AppException(ErrorCode.LESSON_SUB_CATEGORY_NOT_FOUND);
            }

            Specification<Lesson> spec = (root, query, cb) -> {
                query.distinct(true);
                List<Predicate> predicates = new ArrayList<>();
                if (lessonName != null && !lessonName.isBlank()) {
                    predicates.add(cb.like(cb.lower(root.get("lessonName")), "%" + lessonName.toLowerCase() + "%"));
                }
                if (languageCode != null && !languageCode.isBlank()) {
                    predicates.add(cb.equal(root.get("languageCode"), languageCode));
                }
                if (minExpReward != null && minExpReward >= 0) {
                    predicates.add(cb.ge(root.get("expReward"), minExpReward));
                }
                if (categoryId != null) {
                    predicates.add(cb.equal(root.get("lessonCategoryId"), categoryId));
                }
                if (subCategoryId != null) {
                    predicates.add(cb.equal(root.get("lessonSubCategoryId"), subCategoryId));
                }
                if (courseId != null) {
                    predicates.add(cb.equal(root.get("courseId"), courseId));
                }
                if (seriesId != null) {
                    predicates.add(cb.equal(root.get("lessonSeriesId"), seriesId));
                }
                predicates.add(cb.isFalse(root.get("isDeleted")));
                return cb.and(predicates.toArray(new Predicate[0]));
            };

            return lessonRepository.findAll(spec, pageable).map(this::toLessonResponse);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "lesson", key = "#id")
    public LessonResponse getLessonById(UUID id) {
        try {
            Lesson lesson = lessonRepository.findById(id)
                    .filter(l -> !l.isDeleted())
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
            return toLessonResponse(lesson);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lessons", "lesson", "lessonsBySkill", "lessonsByCategory"}, allEntries = true)
    public LessonResponse createLesson(LessonRequest request) {
        try {
            if (request.getLessonName() == null || request.getLessonName().isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            if (request.getLessonCategoryId() != null && !lessonCategoryRepository.existsById(request.getLessonCategoryId())) {
                throw new AppException(ErrorCode.LESSON_CATEGORY_NOT_FOUND);
            }
            if (request.getLessonSubCategoryId() != null && !lessonSubCategoryRepository.existsById(request.getLessonSubCategoryId())) {
                throw new AppException(ErrorCode.LESSON_SUB_CATEGORY_NOT_FOUND);
            }
            Lesson lesson = lessonMapper.toEntity(request);
            lesson.setCreatedAt(OffsetDateTime.now());
            lesson = lessonRepository.save(lesson);
            return toLessonResponse(lesson);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lessons", "lesson", "lessonsBySkill", "lessonsByCategory"}, allEntries = true)
    public LessonResponse updateLesson(UUID id, LessonRequest request) {
        try {
            Lesson lesson = lessonRepository.findById(id)
                    .filter(l -> !l.isDeleted())
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
            if (request.getLessonName() == null || request.getLessonName().isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            if (request.getLessonCategoryId() != null && !lessonCategoryRepository.existsById(request.getLessonCategoryId())) {
                throw new AppException(ErrorCode.LESSON_CATEGORY_NOT_FOUND);
            }
            if (request.getLessonSubCategoryId() != null && !lessonSubCategoryRepository.existsById(request.getLessonSubCategoryId())) {
                throw new AppException(ErrorCode.LESSON_SUB_CATEGORY_NOT_FOUND);
            }
            lessonMapper.updateEntityFromRequest(request, lesson);
            lesson.setUpdatedAt(OffsetDateTime.now());
            lesson = lessonRepository.save(lesson);
            return toLessonResponse(lesson);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lessons", "lesson", "lessonsBySkill", "lessonsByCategory"}, allEntries = true)
    public void deleteLesson(UUID id) {
        try {
            Lesson lesson = lessonRepository.findById(id)
                    .filter(l -> !l.isDeleted())
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
            lesson.setDeleted(true);
            lesson.setDeletedAt(OffsetDateTime.now());
            lessonRepository.save(lesson);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void completeLesson(UUID lessonId, UUID userId, Integer score) {
        try {
            Lesson lesson = lessonRepository.findById(lessonId)
                    .filter(l -> !l.isDeleted())
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
            User user = userRepository.findById(userId)
                    .filter(u -> !u.isDeleted())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            LessonProgress progress = LessonProgress.builder()
                    .id(new LessonProgressId(lessonId, userId))
                    .score(score != null ? score : 0)
                    .completedAt(OffsetDateTime.now())
                    .build();
            lessonProgressRepository.save(progress);

            UserLearningActivity activity = UserLearningActivity.builder()
                    .userId(userId)
                    .activityType(ActivityType.LESSON_COMPLETE)
                    .createdAt(OffsetDateTime.now())
                    .build();
            userLearningActivityRepository.save(activity);

            userService.updateExp(userId, lesson.getExpReward());
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "lessonsBySkill", key = "{#skillType, #pageable.pageNumber, #pageable.pageSize, #pageable.sort}")
    public Page<LessonResponse> getLessonsBySkillType(SkillType skillType, Pageable pageable) {
        try {
            // Validate pagination
            if (pageable.getPageNumber() < 0 || pageable.getPageSize() <= 0) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }

            Specification<Lesson> spec = (root, query, cb) -> {
                query.distinct(true);
                Join<Lesson, LessonQuestion> questionJoin = root.join("lessonQuestions");
                return cb.and(
                        cb.equal(questionJoin.get("skillType"), skillType),
                        cb.isFalse(root.get("isDeleted"))
                );
            };
            return lessonRepository.findAll(spec, pageable).map(this::toLessonResponse);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "lessonsByCategory", key = "{#categoryId, #subCategoryId, #pageable.pageNumber, #pageable.pageSize, #pageable.sort}")
    public Page<LessonResponse> getLessonsByCertificateOrTopic(UUID categoryId, UUID subCategoryId, Pageable pageable) {
        try {
            // Validate pagination
            if (pageable.getPageNumber() < 0 || pageable.getPageSize() <= 0) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }

            // Validate category and subcategory existence
            if (categoryId != null && !lessonCategoryRepository.existsById(categoryId)) {
                throw new AppException(ErrorCode.LESSON_CATEGORY_NOT_FOUND);
            }
            if (subCategoryId != null && !lessonSubCategoryRepository.existsById(subCategoryId)) {
                throw new AppException(ErrorCode.LESSON_SUB_CATEGORY_NOT_FOUND);
            }

            Specification<Lesson> spec = (root, query, cb) -> {
                query.distinct(true);
                List<Predicate> predicates = new ArrayList<>();
                if (categoryId != null) {
                    predicates.add(cb.equal(root.get("lessonCategoryId"), categoryId));
                }
                if (subCategoryId != null) {
                    predicates.add(cb.equal(root.get("lessonSubCategoryId"), subCategoryId));
                }
                predicates.add(cb.isFalse(root.get("isDeleted")));
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            return lessonRepository.findAll(spec, pageable).map(this::toLessonResponse);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private LessonResponse toLessonResponse(Lesson lesson) {
        try {
            List<SkillType> skillTypes = lessonQuestionRepository.findByLessonIdAndIsDeletedFalse(lesson.getLessonId())
                    .stream()
                    .map(LessonQuestion::getSkillType)
                    .distinct()
                    .collect(Collectors.toList());
            List<String> videoUrls = videoRepository.findByLessonIdAndIsDeletedFalse(lesson.getLessonId())
                    .stream()
                    .map(Video::getVideoUrl)
                    .collect(Collectors.toList());

            LessonResponse response = lessonMapper.toResponse(lesson);
            response.setSkillTypes(skillTypes);
            response.setVideoUrls(videoUrls);
            return response;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}