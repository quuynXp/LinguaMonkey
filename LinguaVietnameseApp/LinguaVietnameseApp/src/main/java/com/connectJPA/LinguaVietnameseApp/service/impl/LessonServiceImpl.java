package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.QuizResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.CourseLessonId;
import com.connectJPA.LinguaVietnameseApp.entity.id.CourseVersionLessonId;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressWrongItemsId;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.QuizQuestionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.LessonService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import learning.QuizGenerationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
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
    private final CourseLessonRepository courseLessonRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final UserGoalRepository userGoalRepository;
    private final LessonProgressWrongItemRepository lessonProgressWrongItemRepository;
    private final GrpcClientService grpcClientService;
    private final QuizQuestionMapper quizQuestionMapper;
    private final CourseVersionLessonRepository courseVersionLessonRepository;

    // =================================================================
    // === HÀM SEARCH THAY THẾ ELASTICSEARCH ===
    // =================================================================
    @Override
    public Page<Lesson> searchLessons(String keyword, int page, int size, Map<String, Object> filters) {
        if (keyword == null || keyword.isBlank()) {
            return Page.empty();
        }
        try {
            Pageable pageable = PageRequest.of(page, size);
            // GỌI PHƯƠNG THỨC SEARCH MỚI TRONG REPOSITORY
            return lessonRepository.searchLessonsByKeyword(keyword, pageable);
        } catch (Exception e) {
            // Log lỗi và ném ra SystemException (hoặc AppException nếu bạn có định nghĩa cụ thể)
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public Page<LessonResponse> getAllLessons(String lessonName, String languageCode, Integer minExpReward,
                                             UUID categoryId, UUID subCategoryId, UUID courseId, UUID seriesId, SkillType skillType,
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
                    Join<Lesson, CourseVersionLesson> cvlJoin = root.join("courseVersions"); 
                    
                    Join<CourseVersionLesson, CourseVersion> cvJoin = cvlJoin.join("courseVersion"); 
                    
                    Join<CourseVersion, Course> cJoin = cvJoin.join("course"); 
                    
                    predicates.add(cb.equal(cJoin.get("courseId"), courseId));
                }
                if (seriesId != null) {
                    predicates.add(cb.equal(root.get("lessonSeriesId"), seriesId));
                }
                if (skillType != null) {
                    predicates.add(cb.like(cb.coalesce(root.get("skillTypes"), ""), "%" + skillType.name() + "%"));
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
            User user = userRepository.findById(request.getCreatorId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            Lesson lesson = lessonMapper.toEntity(request);
            if (request.getCourseId() != null) {
                CourseLesson courseLesson = CourseLesson.builder()
                        .id(new CourseLessonId(request.getCourseId(), lesson.getLessonId()))
                        .orderIndex(lesson.getOrderIndex())
                        .build();
                courseLessonRepository.save(courseLesson);
            }
            lesson = lessonRepository.save(lesson);
            return toLessonResponse(lesson);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public List<Lesson> getLessonsByIds(List<UUID> ids) {
        return lessonRepository.findByLessonIdIn(ids);
    }

    @Override
    public Page<Lesson> getLessonsByCreator(UUID creatorId, Pageable pageable) {
        return lessonRepository.findByCreatorId(creatorId, pageable);
    }

    @Override
    @Transactional
    public Map<String,Object> startTest(UUID lessonId, UUID userId) {
        Lesson lesson = lessonRepository.findById(lessonId).filter(l -> !l.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        // load questions
        List<LessonQuestion> questions = lessonQuestionRepository.findByLessonIdOrderByOrderIndex(lessonId);
        if (Boolean.TRUE.equals(lesson.getShuffleQuestions())) {
            Collections.shuffle(questions);
        }

        // prepare response: mask correctAnswer
        List<Map<String,Object>> qDtos = questions.stream().map(q -> {
            Map<String,Object> m = new HashMap<>();
            m.put("questionId", q.getLessonQuestionId());
            m.put("question", q.getQuestion());
            m.put("questionType", q.getQuestionType());
            m.put("options", q.getOptionsJson()); // frontend parse JSON
            m.put("mediaUrl", q.getMediaUrl());
            m.put("weight", q.getWeight());
            m.put("orderIndex", q.getOrderIndex());
            // DO NOT put correctAnswer
            return m;
        }).collect(Collectors.toList());

        // build a lightweight session response (no DB session entity created because we reuse LessonProgress)
        Map<String,Object> resp = new HashMap<>();
        resp.put("lessonId", lessonId);
        resp.put("questions", qDtos);
        resp.put("durationSeconds", lesson.getDurationSeconds());
        resp.put("allowedRetakeCount", lesson.getAllowedRetakeCount());
        // optionally compute user attemptNumber
        int attemptNumber = 1;
        if (userId != null) {
            Optional<LessonProgress> existing = lessonProgressRepository.findById(new LessonProgressId(lessonId, userId));
            attemptNumber = existing.map(LessonProgress::getAttemptNumber).orElse(0) + 1;
        }
        resp.put("attemptNumber", attemptNumber);
        return resp;
    }

    @Override
    @Transactional
    public Map<String,Object> submitTest(UUID lessonId, UUID userId, Map<String,Object> payload) {
        // payload expected: { "answers": { "<questionId>": "<answer>" }, "attemptNumber": n }
        Map<String,Object> answers = (Map<String,Object>) payload.get("answers");
        Integer attemptNumber = payload.get("attemptNumber") != null ? (Integer) payload.get("attemptNumber") : 1;

        Lesson lesson = lessonRepository.findById(lessonId).filter(l -> !l.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        if (userId == null) throw new AppException(ErrorCode.USER_NOT_FOUND);

        List<LessonQuestion> questions = lessonQuestionRepository.findByLessonIdOrderByOrderIndex(lessonId);

        int totalMax = questions.stream().mapToInt(q -> q.getWeight() == null ? 1 : q.getWeight()).sum();
        int totalScore = 0;
        List<LessonProgressWrongItem> wrongItems = new ArrayList<>();

        for (LessonQuestion q : questions) {
            String qid = q.getLessonQuestionId().toString();
            Object rawAns = answers.get(qid);
            boolean correct = false;
            int scoreGiven = 0;
            if (q.getQuestionType() == QuestionType.MCQ || q.getQuestionType() == null) {
                // MCQ: correctAnswer -> option id or index
                if (rawAns != null && q.getCorrectOption() != null) {
                    if (rawAns.toString().trim().equalsIgnoreCase(q.getCorrectOption().trim())) {
                        correct = true;
                    }
                }
            } else if (q.getQuestionType() == QuestionType.FILL_BLANK) {
                // simple equality or CSV of acceptable answers
                if (rawAns != null && q.getCorrectOption() != null) {
                    String got = rawAns.toString().trim().toLowerCase();
                    String correctAnswer = q.getCorrectOption().trim().toLowerCase();
                    // support multiple options separated by ||
                    List<String> opts = Arrays.stream(correctAnswer.split("\\|\\|")).map(String::trim).collect(Collectors.toList());
                    for (String o : opts) {
                        if (o.equals(got)) { correct = true; break; }
                    }
                }
            } else if (q.getQuestionType() == QuestionType.ORDERING) {
                // correctAnswer = JSON array of indices "['0','2','1']"
                if (rawAns != null && q.getCorrectOption() != null) {
                    String got = rawAns.toString();
                    if (got.equals(q.getCorrectOption())) correct = true;
                }
            } else if (q.getQuestionType() == QuestionType.SPEAKING || q.getQuestionType() == QuestionType.WRITING) {
                // cannot auto-grade reliably -> mark needsReview
                correct = false;
            }

            if (correct) {
                scoreGiven = q.getWeight() == null ? 1 : q.getWeight();
                totalScore += scoreGiven;
            } else {
                // save wrong item
                LessonProgressWrongItemsId wid = new LessonProgressWrongItemsId();
                wid.setLessonId(lessonId);
                wid.setUserId(userId);
                wid.setLessonQuestionId(q.getLessonQuestionId());
                wid.setAttemptNumber(attemptNumber);
                LessonProgressWrongItem wi = LessonProgressWrongItem.builder()
                        .id(wid)
                        .wrongAnswer(rawAns == null ? null : rawAns.toString())
                        .build();
                wrongItems.add(wi);
            }
        }

        // persist wrong items
        if (!wrongItems.isEmpty()) {
            lessonProgressWrongItemRepository.saveAll(wrongItems);
        }

        // compute percent
        float percent = totalMax == 0 ? 0f : (totalScore * 100f / totalMax);

        // update or create LessonProgress
        LessonProgressId pid = new LessonProgressId(lessonId, userId);
        LessonProgress lp = lessonProgressRepository.findById(pid)
                .orElse(LessonProgress.builder().id(pid).build());
        lp.setScore(percent);
        lp.setMaxScore(totalMax);
        lp.setAttemptNumber(attemptNumber);
        lp.setCompletedAt(OffsetDateTime.now());
        // set needsReview if any speaking/writing present in answers
        boolean hasOpenAnswer = questions.stream().anyMatch(q -> q.getQuestionType() == QuestionType.SPEAKING || q.getQuestionType() == QuestionType.WRITING);
        lp.setNeedsReview(hasOpenAnswer);
        // store answers JSON
        try { lp.setAnswersJson(new ObjectMapper().writeValueAsString(answers)); } catch (Exception ex) { lp.setAnswersJson("{}"); }
        lessonProgressRepository.save(lp);

        // compute progressPercent vs userGoal (basic)
        int progressPercent = computeProgressVsUserGoal(userId, lesson, percent);

        // build response
        Map<String,Object> result = new HashMap<>();
        result.put("lessonId", lessonId);
        result.put("totalScore", totalScore);
        result.put("maxScore", totalMax);
        result.put("percent", percent);
        result.put("needsReview", lp.getNeedsReview());
        result.put("progressPercent", progressPercent);

        return result;
    }

    @Override
    public QuizResponse generateSoloQuiz(String token, UUID userId) {
        if (userId == null) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        log.info("Generating solo quiz for user: {}", userId);
        try {
            // 1. Gọi gRPC (async) và chờ kết quả (sync)
            QuizGenerationResponse grpcResponse = grpcClientService.generateLanguageQuiz(
                    token,
                    userId.toString(),
                    15, // 15 câu cho solo
                    "solo",
                    null
            ).get(); // .get() để chờ CompletableFuture

            // 2. Map từ Proto -> DTO và trả về
            return quizQuestionMapper.toResponse(grpcResponse);
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to generate solo quiz for user {}: {}", userId, e.getMessage());
            if (e.getCause() instanceof AppException appEx) {
                throw appEx; // Ném lại lỗi AppException từ gRPC
            }
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @Override
    @Transactional
    public Lesson saveLessonForVersion(Lesson lesson, UUID versionId, Integer lessonIndex) {
        try {
            if (lesson.getLessonName() == null) {
                lesson.setLessonName("Untitled Lesson");
            }

            // Set default status nếu cần
            lesson.setDeleted(false);

            Lesson savedLesson = lessonRepository.save(lesson);

            // B. Tạo liên kết với CourseVersion (Bảng CourseVersionLesson)
            CourseVersionLessonId linkId = new CourseVersionLessonId(versionId, savedLesson.getLessonId());

            CourseVersionLesson courseVersionLesson = CourseVersionLesson.builder()
                    .id(linkId)
                    .orderIndex(lessonIndex)
                    .build();

            courseVersionLessonRepository.save(courseVersionLesson);

            return savedLesson;

        } catch (Exception e) {
            log.error("Error saving lesson for version: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public QuizResponse generateTeamQuiz(String token, String topic) {
        log.info("Generating team quiz with topic: {}", topic);
        try {
            // 1. Gọi gRPC (async) và chờ kết quả (sync)
            QuizGenerationResponse grpcResponse = grpcClientService.generateLanguageQuiz(
                    token,
                    null, // không có userId cho team
                    30,  // 30 câu cho team
                    "team",
                    topic
            ).get(); // .get() để chờ CompletableFuture

            // 2. Map từ Proto -> DTO và trả về
            return quizQuestionMapper.toResponse(grpcResponse);
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to generate team quiz: {}", e.getMessage());
            if (e.getCause() instanceof AppException appEx) {
                throw appEx; // Ném lại lỗi AppException từ gRPC
            }
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }


    @Override
    @Transactional
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
            SkillType skillType = lessonRepository.findSkillTypeByLessonIdAndIsDeletedFalse(lesson.getLessonId());
            List<String> videoUrls = videoRepository.findByLessonIdAndIsDeletedFalse(lesson.getLessonId())
                    .stream()
                    .map(Video::getVideoUrl)
                    .collect(Collectors.toList());

            LessonResponse response = lessonMapper.toResponse(lesson);
            response.setSkillTypes(skillType != null ? skillType : SkillType.READING);
            response.setVideoUrls(videoUrls);
            return response;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

//    helper
private int computeProgressVsUserGoal(UUID userId, Lesson lesson, float percentScore) {
    Optional<UserGoal> gOpt = userGoalRepository.findTopByUserIdAndLanguageCodeOrderByCreatedAtDesc(userId, lesson.getLanguageCode());
    if (gOpt.isEmpty()) return Math.round(percentScore);

    UserGoal g = gOpt.get();
    if (g.getTargetScore() > 0) {
        // assume percentScore maps to same scale (best-effort)
        int p = Math.min(100, Math.round(percentScore * 100.0f / g.getTargetScore()));
        return p;
    } else if (g.getTargetProficiency() != null) {
        Map<ProficiencyLevel,Integer> map = Map.of(
                ProficiencyLevel.A1,1, ProficiencyLevel.A2,2, ProficiencyLevel.B1,3,
                ProficiencyLevel.B2,4, ProficiencyLevel.C1,5, ProficiencyLevel.C2,6
        );
        int currentIndex = inferProficiencyFromPercent(percentScore); // simple mapping
        int targetIndex = map.getOrDefault(g.getTargetProficiency(), 3);
        return Math.min(100, (currentIndex * 100 / targetIndex));
    }
    return Math.round(percentScore);
}

    private int inferProficiencyFromPercent(float p) {
        if (p < 30) return 1;
        if (p < 50) return 2;
        if (p < 70) return 3;
        if (p < 85) return 4;
        return 5;
    }

}