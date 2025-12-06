package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.request.LessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonHierarchicalResponse;
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
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
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
    private final CourseVersionLessonRepository courseVersionLessonRepository;
    private final CourseVersionEnrollmentRepository CourseVersionEnrollmentRepository;
    private final UserGoalRepository userGoalRepository;
    private final LessonProgressWrongItemRepository lessonProgressWrongItemRepository;
    private final GrpcClientService grpcClientService;
    private final QuizQuestionMapper quizQuestionMapper;
    
    private final DailyChallengeService dailyChallengeService;
    private final BadgeService badgeService;

    // ... (Keep existing searchLessons, getAllLessons, getLessonById, createLesson methods unchanged) ...

    @Override
    public Page<Lesson> searchLessons(String keyword, int page, int size, Map<String, Object> filters) {
        if (keyword == null || keyword.isBlank()) {
            return Page.empty();
        }
        try {
            Pageable pageable = PageRequest.of(page, size);
            return lessonRepository.searchLessonsByKeyword(keyword, pageable);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public Page<LessonResponse> getAllLessons(String lessonName, String languageCode, Integer minExpReward,
                                              UUID categoryId, UUID subCategoryId, UUID courseId, UUID versionId, UUID seriesId, SkillType skillType,
                                              Pageable pageable) {
        // ... (Keep existing implementation) ...
        try {
            if (pageable.getPageNumber() < 0 || pageable.getPageSize() <= 0) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
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
                
                if (versionId != null) {
                    Join<Lesson, CourseVersionLesson> cvlJoin = root.join("courseVersions");
                    predicates.add(cb.equal(cvlJoin.get("id").get("versionId"), versionId));
                } else if (courseId != null) {
                    Join<Lesson, CourseVersionLesson> cvlJoin = root.join("courseVersions");
                    Join<CourseVersionLesson, CourseVersion> cvJoin = cvlJoin.join("courseVersion");
                    Join<CourseVersion, Course> cJoin = cvJoin.join("course");
                    predicates.add(cb.equal(cJoin.get("courseId"), courseId));
                }
                
                if (seriesId != null) {
                    predicates.add(cb.equal(root.get("lessonSeriesId"), seriesId));
                }
                if (skillType != null) {
                    predicates.add(cb.equal(root.get("skillTypes"), skillType));
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

    // ... (Keep getLessonById, createLesson, getLessonsByIds, getLessonsByCreator unchanged) ...
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
            userRepository.findById(request.getCreatorId())
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
    public Map<String, Object> startTest(UUID lessonId, UUID userId) {
        Lesson lesson = lessonRepository.findById(lessonId).filter(l -> !l.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        List<LessonQuestion> questions = lessonQuestionRepository.findByLesson_LessonIdOrderByOrderIndex(lessonId);
        
        if (Boolean.TRUE.equals(lesson.getShuffleQuestions())) {
            Collections.shuffle(questions);
        }

        List<Map<String, Object>> qDtos = questions.stream().map(q -> {
            Map<String, Object> m = new HashMap<>();
            m.put("lessonQuestionId", q.getLessonQuestionId()); 
            m.put("lessonId", q.getLesson().getLessonId());
            m.put("question", q.getQuestion());
            m.put("questionType", q.getQuestionType());
            
            m.put("optionA", q.getOptionA());
            m.put("optionB", q.getOptionB());
            m.put("optionC", q.getOptionC());
            m.put("optionD", q.getOptionD());
            m.put("correctOption", q.getCorrectOption());
            
            m.put("mediaUrl", q.getMediaUrl());
            m.put("weight", q.getWeight());
            m.put("orderIndex", q.getOrderIndex());
            m.put("transcript", q.getTranscript());
            m.put("explainAnswer", q.getExplainAnswer()); 
            m.put("skillType", q.getSkillType());
            m.put("languageCode", q.getLanguageCode());
            m.put("optionsJson", q.getOptionsJson());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> resp = new HashMap<>();
        resp.put("lessonId", lessonId);
        resp.put("questions", qDtos);
        resp.put("durationSeconds", lesson.getDurationSeconds());
        resp.put("allowedRetakeCount", lesson.getAllowedRetakeCount());
        
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
    public Map<String, Object> submitTest(UUID lessonId, UUID userId, Map<String, Object> payload) {
        Map<String, Object> answers = (Map<String, Object>) payload.get("answers");
        Integer attemptNumber = payload.get("attemptNumber") != null ? (Integer) payload.get("attemptNumber") : 1;
        String token = (String) payload.get("token");

        Lesson lesson = lessonRepository.findById(lessonId).filter(l -> !l.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        if (userId == null) throw new AppException(ErrorCode.USER_NOT_FOUND);

        List<LessonQuestion> questions = lessonQuestionRepository.findByLesson_LessonIdOrderByOrderIndex(lessonId);

        int totalMax = questions.stream().mapToInt(q -> q.getWeight() == null ? 1 : q.getWeight()).sum();
        int totalScore = 0;
        List<LessonProgressWrongItem> wrongItems = new ArrayList<>();

        for (LessonQuestion q : questions) {
            String qid = q.getLessonQuestionId().toString();
            Object rawAns = answers.get(qid);
            
            String userAnswerText = null;
            byte[] audioBytes = null;
            byte[] imageBytes = null;
            
            if (rawAns instanceof Map) {
                Map<String, Object> ansMap = (Map<String, Object>) rawAns;
                userAnswerText = (String) ansMap.get("text_answer");
                String audioBase64 = (String) ansMap.get("audio_data");
                String imageBase64 = (String) ansMap.get("image_data");
                
                if (audioBase64 != null) audioBytes = Base64.getDecoder().decode(audioBase64);
                if (imageBase64 != null) imageBytes = Base64.getDecoder().decode(imageBase64);
            } else if (rawAns != null) {
                userAnswerText = rawAns.toString();
            }

            int scoreGiven = 0;
            boolean correct = false;
            
            // Logic check từng loại câu hỏi
            if (q.getQuestionType() == QuestionType.MULTIPLE_CHOICE || 
                q.getQuestionType() == QuestionType.FILL_IN_THE_BLANK || 
                q.getQuestionType() == QuestionType.ORDERING ||
                q.getQuestionType() == QuestionType.TRUE_FALSE ||
                q.getQuestionType() == QuestionType.MATCHING) {
                
                correct = checkDeterministicAnswer(q, userAnswerText);
                scoreGiven = correct ? (q.getWeight() == null ? 1 : q.getWeight()) : 0;
            }
            else if (q.getQuestionType() == QuestionType.SPEAKING) {
                scoreGiven = checkSpeakingAnswer(q, token, audioBytes);
                correct = scoreGiven >= (q.getWeight() != null ? q.getWeight() * 0.7 : 70);
            }
            else if (q.getQuestionType() == QuestionType.WRITING || q.getQuestionType() == QuestionType.ESSAY) {
                // Sửa đổi: Truyền cả imageBytes (nếu user upload)
                scoreGiven = checkWritingAnswer(q, token, userAnswerText, imageBytes);
                correct = scoreGiven >= (q.getWeight() != null ? q.getWeight() * 0.5 : 50); // Threshold linh động
            }

            if (correct) {
                totalScore += scoreGiven;
            } else {
                LessonProgressWrongItemsId wid = new LessonProgressWrongItemsId();
                wid.setLessonId(lessonId);
                wid.setUserId(userId);
                wid.setLessonQuestionId(q.getLessonQuestionId());
                wid.setAttemptNumber(attemptNumber);
                LessonProgressWrongItem wi = LessonProgressWrongItem.builder()
                        .id(wid)
                        .wrongAnswer(userAnswerText)
                        .build();
                wrongItems.add(wi);
            }
        }

        if (!wrongItems.isEmpty()) {
            lessonProgressWrongItemRepository.saveAll(wrongItems);
        }

        float percent = totalMax == 0 ? 0f : ((float)totalScore / totalMax) * 100f;

        LessonProgressId pid = new LessonProgressId(lessonId, userId);
        LessonProgress lp = lessonProgressRepository.findById(pid)
                .orElse(LessonProgress.builder().id(pid).build());
        
        if (lp.getScore() < 0 || percent > lp.getScore()) {
            lp.setScore(percent);
            lp.setMaxScore(totalMax);
            try {
                lp.setAnswersJson(new ObjectMapper().writeValueAsString(answers));
            } catch (Exception ex) {
                lp.setAnswersJson("{}");
            }
        }
        
        lp.setAttemptNumber(attemptNumber);
        if (lp.getCompletedAt() == null) {
            lp.setCompletedAt(OffsetDateTime.now());
        }
        
        boolean needsReview = questions.stream().anyMatch(q -> 
            (q.getQuestionType() == QuestionType.SPEAKING || q.getQuestionType() == QuestionType.WRITING) 
            && (percent < 100)
        );
        lp.setNeedsReview(needsReview);
        
        lessonProgressRepository.save(lp);
        updateCourseProgressIfApplicable(userId, lessonId);

        if (percent >= 80) { 
            dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LESSON_COMPLETED, 1);
            badgeService.updateBadgeProgress(userId, BadgeType.LESSON_COUNT, 1);
            
            ChallengeType skillChallenge = mapSkillToChallengeType(lesson.getSkillTypes());
            if (skillChallenge != null) {
                dailyChallengeService.updateChallengeProgress(userId, skillChallenge, 1);
            }
        }
        dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LEARNING_TIME, lesson.getDurationSeconds() / 60);

        int progressPercent = computeProgressVsUserGoal(userId, lesson, percent);
        Map<String, Object> result = new HashMap<>();
        result.put("lessonId", lessonId);
        result.put("totalScore", totalScore);
        result.put("maxScore", totalMax);
        result.put("percent", percent);
        result.put("needsReview", lp.getNeedsReview());
        result.put("progressPercent", progressPercent);
        return result;
    }
    
    private ChallengeType mapSkillToChallengeType(SkillType skill) {
        if (skill == null) return null;
        switch (skill) {
            case SPEAKING: return ChallengeType.SPEAKING_PRACTICE;
            case LISTENING: return ChallengeType.LISTENING_PRACTICE;
            case READING: return ChallengeType.READING_COMPREHENSION;
            case WRITING: return ChallengeType.VOCABULARY_REVIEW; 
            default: return null;
        }
    }

    private boolean checkDeterministicAnswer(LessonQuestion q, String userAnswerText) {
        if (userAnswerText == null || q.getCorrectOption() == null) return false;
        String correctAnswer = q.getCorrectOption().trim().toLowerCase();
        String got = userAnswerText.trim().toLowerCase();

        if (q.getQuestionType() == QuestionType.MULTIPLE_CHOICE || q.getQuestionType() == QuestionType.ORDERING) {
            return got.equalsIgnoreCase(correctAnswer);
        } 
        if (q.getQuestionType() == QuestionType.FILL_IN_THE_BLANK) {
            List<String> validOptions = Arrays.stream(correctAnswer.split("\\|\\|")).map(String::trim).collect(Collectors.toList());
            return validOptions.contains(got);
        }
        if (q.getQuestionType() == QuestionType.MATCHING) {
            // Simplistic check, ideally match JSON pairs
            return got.equalsIgnoreCase(correctAnswer);
        }
        return false;
    }

    private int checkSpeakingAnswer(LessonQuestion q, String token, byte[] audioBytes) {
        if (audioBytes == null || q.getTranscript() == null) return 0;
        try {
            PronunciationResponseBody response = grpcClientService.callCheckPronunciationAsync(
                token, audioBytes, q.getLanguageCode(), q.getTranscript()).get();
            return (int) response.getScore();
        } catch (Exception e) {
            log.error("Speaking check failed for Q: " + q.getLessonQuestionId(), e);
            return 0;
        }
    }

    // --- REFACTORED WRITING CHECK LOGIC ---
    private int checkWritingAnswer(LessonQuestion q, String token, String userText, byte[] userUploadedImageBytes) {
        if (userText == null || q.getQuestion() == null) return 0;
        
        String mediaUrl = null;
        String mimeType = "text/plain";
        byte[] mediaBytes = null;

        if (userUploadedImageBytes != null && userUploadedImageBytes.length > 0) {
            mediaBytes = userUploadedImageBytes;
            mimeType = "image/jpeg"; 
        } 
        else if (q.getMediaUrl() != null && !q.getMediaUrl().isEmpty()) {
            mediaUrl = q.getMediaUrl();
            
            // Logic đoán loại media đơn giản hóa để gửi sang Python
            if (q.getSkillType() == SkillType.LISTENING) {
                mimeType = "audio/mpeg";
            } else {
                mimeType = "image/jpeg";
            }
        }

        try {
            WritingResponseBody response = grpcClientService.callCheckWritingAssessmentAsync(
                token, userText, q.getQuestion(), mediaBytes, mediaUrl, mimeType).get();
            return (int) response.getScore();
        } catch (Exception e) {
            log.error("Writing check failed for Q: " + q.getLessonQuestionId(), e);
            return 0;
        }
    }

    @Override
    @Transactional
    public void completeLesson(UUID lessonId, UUID userId, Integer score) {
        try {
            Lesson lesson = lessonRepository.findById(lessonId)
                    .filter(l -> !l.isDeleted())
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
            
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
            
            dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LESSON_COMPLETED, 1);
            badgeService.updateBadgeProgress(userId, BadgeType.LESSON_COUNT, 1);

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public Page<LessonResponse> getLessonsBySkillType(SkillType skillType, Pageable pageable) {
        try {
            Specification<Lesson> spec = (root, query, cb) -> {
                query.distinct(true);
                Join<Lesson, LessonQuestion> questionJoin = root.join("lessonQuestions");
                return cb.and(
                        cb.equal(questionJoin.get("skillType"), skillType),
                        cb.isFalse(root.get("isDeleted"))
                );
            };
            return lessonRepository.findAll(spec, pageable).map(this::toLessonResponse);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public Page<LessonResponse> getLessonsByCertificateOrTopic(UUID categoryId, UUID subCategoryId, Pageable pageable) {
        try {
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
            SkillType skillType = lesson.getSkillTypes();
            List<String> videoUrls = videoRepository.findByLessonIdAndIsDeletedFalse(lesson.getLessonId())
                    .stream().map(Video::getVideoUrl).collect(Collectors.toList());

            LessonResponse response = lessonMapper.toResponse(lesson);
            response.setSkillTypes(skillType != null ? skillType : SkillType.READING);
            response.setVideoUrls(videoUrls);
            return response;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private int computeProgressVsUserGoal(UUID userId, Lesson lesson, float percentScore) {
        Optional<UserGoal> gOpt = userGoalRepository.findTopByUserIdAndLanguageCodeOrderByCreatedAtDesc(userId, lesson.getLanguageCode());
        if (gOpt.isEmpty()) return Math.round(percentScore);

        UserGoal g = gOpt.get();
        if (g.getTargetScore() > 0) {
            return Math.min(100, Math.round(percentScore * 100.0f / g.getTargetScore()));
        } else if (g.getTargetProficiency() != null) {
            Map<ProficiencyLevel, Integer> map = Map.of(
                    ProficiencyLevel.A1, 1, ProficiencyLevel.A2, 2, ProficiencyLevel.B1, 3,
                    ProficiencyLevel.B2, 4, ProficiencyLevel.C1, 5, ProficiencyLevel.C2, 6
            );
            int currentIndex = inferProficiencyFromPercent(percentScore);
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

    @Override
    @Transactional
    public Lesson saveLessonForVersion(Lesson lesson, UUID versionId, Integer lessonIndex) {
        try {
            if (lesson.getLessonName() == null) lesson.setLessonName("Untitled Lesson");
            lesson.setDeleted(false);
            Lesson savedLesson = lessonRepository.save(lesson);

            CourseVersionLessonId linkId = new CourseVersionLessonId(versionId, savedLesson.getLessonId());
            CourseVersionLesson courseVersionLesson = CourseVersionLesson.builder()
                    .id(linkId)
                    .orderIndex(lessonIndex)
                    .build();
            courseVersionLessonRepository.save(courseVersionLesson);
            return savedLesson;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public QuizResponse generateTeamQuiz(String token, String topic) {
        try {
            QuizGenerationResponse grpcResponse = grpcClientService.generateLanguageQuiz(
                    token, null, 30, "team", topic).get();
            return quizQuestionMapper.toResponse(grpcResponse);
        } catch (InterruptedException | ExecutionException e) {
            if (e.getCause() instanceof AppException appEx) throw appEx;
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @Override
    public QuizResponse generateSoloQuiz(String token, UUID userId) {
        if (userId == null) throw new AppException(ErrorCode.INVALID_KEY);
        try {
            QuizGenerationResponse grpcResponse = grpcClientService.generateLanguageQuiz(
                    token, userId.toString(), 15, "solo", null).get();
            return quizQuestionMapper.toResponse(grpcResponse);
        } catch (InterruptedException | ExecutionException e) {
            if (e.getCause() instanceof AppException appEx) throw appEx;
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @Override
    @Transactional
    public LessonResponse updateLesson(UUID id, LessonRequest request) {
        try {
            Lesson lesson = lessonRepository.findById(id).filter(l -> !l.isDeleted())
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
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
            Lesson lesson = lessonRepository.findById(id).filter(l -> !l.isDeleted())
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
    public List<LessonHierarchicalResponse> getLessonsTreeBySkill(SkillType skillType, String languageCode) {
        List<LessonCategory> categories = lessonCategoryRepository.findDistinctCategoriesByLessonSkillAndLanguage(skillType, languageCode);
        return categories.stream().map(cat -> {
            List<LessonSubCategory> subCats = lessonSubCategoryRepository.findByLessonCategoryIdAndLanguageCodeAndIsDeletedFalse(cat.getLessonCategoryId(), languageCode, Pageable.unpaged()).getContent();
            List<LessonHierarchicalResponse.SubCategoryDto> subCatDtos = subCats.stream().map(sub -> {
                List<Lesson> lessons = lessonRepository.findByLessonSubCategoryIdAndSkillTypesAndIsDeletedFalseOrderByOrderIndex(sub.getLessonSubCategoryId(), skillType);
                return LessonHierarchicalResponse.SubCategoryDto.builder()
                        .subCategoryId(sub.getLessonSubCategoryId())
                        .subCategoryName(sub.getLessonSubCategoryName())
                        .lessons(lessons.stream().map(this::toLessonResponse).collect(Collectors.toList()))
                        .build();
            }).collect(Collectors.toList());
            return LessonHierarchicalResponse.builder()
                    .categoryId(cat.getLessonCategoryId())
                    .categoryName(cat.getLessonCategoryName())
                    .coinReward(cat.getCoinReward())
                    .subCategories(subCatDtos)
                    .build();
        }).collect(Collectors.toList());
    }

    private void updateCourseProgressIfApplicable(UUID userId, UUID lessonId) {
        List<CourseVersionEnrollment> enrollments = CourseVersionEnrollmentRepository.findActiveEnrollmentsByUserIdAndLessonId(userId, lessonId);
        for (CourseVersionEnrollment enrollment : enrollments) {
            UUID versionId = enrollment.getCourseVersion().getVersionId();
            long totalLessons = CourseVersionEnrollmentRepository.countLessonsInVersion(versionId);
            if (totalLessons > 0) {
                long completedLessons = CourseVersionEnrollmentRepository.countCompletedLessonsInVersion(userId, versionId);
                double progressPercent = Math.round(((double) completedLessons / totalLessons) * 10000.0) / 100.0;
                enrollment.setProgress(progressPercent);
                if (progressPercent >= 100.0 && enrollment.getCompletedAt() == null) {
                    enrollment.setStatus(CourseVersionEnrollmentStatus.COMPLETED);
                    enrollment.setCompletedAt(OffsetDateTime.now());
                }
                CourseVersionEnrollmentRepository.save(enrollment);
            }
        }
    }
}