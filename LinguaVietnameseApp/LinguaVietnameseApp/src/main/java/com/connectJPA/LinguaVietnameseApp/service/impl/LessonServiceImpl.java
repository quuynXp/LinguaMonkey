package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonQuestionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.LessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonHierarchicalResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonQuestionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.QuizResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.CourseLessonId;
import com.connectJPA.LinguaVietnameseApp.entity.id.CourseVersionLessonId;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
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
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionEnrollmentService;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
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
    private final CourseVersionEnrollmentRepository courseVersionEnrollmentRepository;
    private final UserGoalRepository userGoalRepository;
    private final LessonProgressWrongItemRepository lessonProgressWrongItemRepository;
    private final GrpcClientService grpcClientService;
    private final QuizQuestionMapper quizQuestionMapper;
    private final CourseVersionEnrollmentService courseEnrollmentService;
    private final LeaderboardRepository leaderboardRepository;
    private final LeaderboardEntryRepository leaderboardEntryRepository;
    private final DailyChallengeService dailyChallengeService;
    private final BadgeService badgeService;
    private final PlatformTransactionManager transactionManager;

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

    @Override
    public LessonResponse getLessonById(UUID id) {
        try {
            Lesson lesson = lessonRepository.findById(id)
                    .filter(l -> !l.isDeleted())
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
            
            LessonResponse response = toLessonResponse(lesson);
            response.setQuestions(getQuestionResponses(id));

            return response;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error getting lesson detail", e);
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
            lesson = lessonRepository.save(lesson);

            if (request.getCourseId() != null) {
                CourseLesson courseLesson = CourseLesson.builder()
                        .id(new CourseLessonId(request.getCourseId(), lesson.getLessonId()))
                        .orderIndex(lesson.getOrderIndex() != null ? lesson.getOrderIndex() : 0)
                        .build();
                courseLessonRepository.save(courseLesson);
            }
            
            if (request.getVersionId() != null) {
                saveLessonForVersion(lesson, request.getVersionId(), request.getOrderIndex());
            }

            if (request.getQuestions() != null && !request.getQuestions().isEmpty()) {
                List<LessonQuestion> questions = processQuestions(request.getQuestions(), lesson);
                lessonQuestionRepository.saveAll(questions);
            }

            LessonResponse response = toLessonResponse(lesson);
            response.setQuestions(getQuestionResponses(lesson.getLessonId())); 
            return response;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error creating lesson: ", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
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

            if (request.getQuestions() != null) {
                List<LessonQuestion> existingQuestions = lessonQuestionRepository.findByLesson_LessonIdOrderByOrderIndex(id);
                existingQuestions.forEach(q -> q.setDeleted(true));
                lessonQuestionRepository.saveAll(existingQuestions);

                if (!request.getQuestions().isEmpty()) {
                    List<LessonQuestion> newQuestions = processQuestions(request.getQuestions(), lesson);
                    lessonQuestionRepository.saveAll(newQuestions);
                }
            }

            LessonResponse response = toLessonResponse(lesson);
            response.setQuestions(getQuestionResponses(lesson.getLessonId()));
            return response;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error updating lesson", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private List<LessonQuestion> processQuestions(List<LessonQuestionRequest> dtos, Lesson lesson) {
        return dtos.stream()
                .map(dto -> mapToQuestionEntity(dto, lesson))
                .collect(Collectors.toList());
    }

    private LessonQuestion mapToQuestionEntity(LessonQuestionRequest dto, Lesson lesson) {
        return LessonQuestion.builder()
                .lesson(lesson) 
                .question(dto.getQuestion())
                .questionType(dto.getQuestionType())
                .skillType(dto.getSkillType() != null ? dto.getSkillType() : lesson.getSkillTypes())
                .languageCode(dto.getLanguageCode() != null ? dto.getLanguageCode() : lesson.getLanguageCode())
                .optionsJson(dto.getOptionsJson())
                .optionA(dto.getOptionA())
                .optionB(dto.getOptionB())
                .optionC(dto.getOptionC())
                .optionD(dto.getOptionD())
                .correctOption(dto.getCorrectOption())
                .mediaUrl(dto.getMediaUrl())
                .transcript(dto.getTranscript())
                .explainAnswer(dto.getExplainAnswer())
                .weight(dto.getWeight() != null ? dto.getWeight() : 1)
                .orderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : 0)
                .isDeleted(false)
                .build();
    }

    private List<LessonQuestionResponse> getQuestionResponses(UUID lessonId) {
        List<LessonQuestion> questions = lessonQuestionRepository.findByLesson_LessonIdOrderByOrderIndex(lessonId);
        return questions.stream()
            .filter(q -> !q.isDeleted())
            .map(q -> LessonQuestionResponse.builder()
                .lessonQuestionId(q.getLessonQuestionId())
                .lessonId(q.getLesson().getLessonId())
                .question(q.getQuestion())
                .questionType(q.getQuestionType())
                .skillType(q.getSkillType())
                .languageCode(q.getLanguageCode())
                .optionsJson(q.getOptionsJson())
                .optionA(q.getOptionA())
                .optionB(q.getOptionB())
                .optionC(q.getOptionC())
                .optionD(q.getOptionD())
                .correctOption(q.getCorrectOption())
                .transcript(q.getTranscript())
                .mediaUrl(q.getMediaUrl())
                .explainAnswer(q.getExplainAnswer())
                .weight(q.getWeight())
                .orderIndex(q.getOrderIndex())
                .isDeleted(q.isDeleted())
                .build()
            ).collect(Collectors.toList());
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

        if (userId != null && lesson.getCourseVersions() != null && !lesson.getCourseVersions().isEmpty()) {
            boolean isEnrolled = false;
            
            for (CourseVersionLesson link : lesson.getCourseVersions()) {
                CourseVersion version = link.getCourseVersion();
                boolean enrolled = courseVersionEnrollmentRepository.existsByUserIdAndCourseVersion_VersionId(userId, version.getVersionId());
                
                if (enrolled) {
                    isEnrolled = true;
                    break;
                }
            }

            if (!isEnrolled) {
                for (CourseVersionLesson link : lesson.getCourseVersions()) {
                    CourseVersion version = link.getCourseVersion();
                    Course course = version.getCourse();
                    
                    if (course.getLatestPublicVersion().getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                        
                        Optional<CourseVersionEnrollment> existingEnrollment = courseVersionEnrollmentRepository
                                .findByCourseVersion_VersionIdAndUserId(version.getVersionId(), userId);

                        if (existingEnrollment.isPresent()) {
                            isEnrolled = true;
                        } else {
                            CourseVersionEnrollment newEnrollment = CourseVersionEnrollment.builder()
                                    .courseVersion(version)
                                    .user(userRepository.getReferenceById(userId))
                                    .userId(userId)
                                    .enrolledAt(OffsetDateTime.now())
                                    .status(CourseVersionEnrollmentStatus.IN_PROGRESS) 
                                    .progress(0.0)
                                    .build();
                            courseVersionEnrollmentRepository.save(newEnrollment);
                            isEnrolled = true;
                        }
                        break; 
                    }
                }
            }
            if (!isEnrolled) {
                throw new AppException(ErrorCode.COURSE_NOT_ENROLLED);
            }
        }

        List<LessonQuestion> questions = lessonQuestionRepository.findByLesson_LessonIdOrderByOrderIndex(lessonId);
        questions = questions.stream().filter(q -> !q.isDeleted()).collect(Collectors.toList());
        
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
        float latestScore = 0.0f; 
        List<String> wrongQuestionIds = new ArrayList<>();

        if (userId != null) {
            Optional<LessonProgress> existing = lessonProgressRepository.findById(new LessonProgressId(lessonId, userId));
            if (existing.isPresent()) {
                LessonProgress lp = existing.get();
                attemptNumber = lp.getAttemptNumber() + 1;
                latestScore = lp.getScore();
            }

            List<LessonProgressWrongItem> wrongItems = lessonProgressWrongItemRepository
                    .findById_LessonIdAndId_UserIdAndIsDeletedFalse(lessonId, userId);
            
            wrongQuestionIds = wrongItems.stream()
                    .map(item -> item.getId().getLessonQuestionId().toString())
                    .collect(Collectors.toList());
        }

        resp.put("attemptNumber", attemptNumber);
        resp.put("latestScore", latestScore); 
        resp.put("wrongQuestionIds", wrongQuestionIds); 

        return resp;
    }

    @Override
    @Transactional
    public Map<String, Object> submitTest(UUID lessonId, UUID userId, Map<String, Object> payload) {
        Map<String, Object> answers = (Map<String, Object>) payload.get("answers");
        Integer attemptNumber = payload.get("attemptNumber") != null ? (Integer) payload.get("attemptNumber") : 1;
        String token = (String) payload.get("token");

        Integer durationSeconds = 0;
        if (payload.containsKey("durationSeconds")) {
            try {
                durationSeconds = Integer.parseInt(payload.get("durationSeconds").toString());
            } catch (Exception e) {
                durationSeconds = 0;
            }
        }

        Lesson lesson = lessonRepository.findById(lessonId).filter(l -> !l.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        if (userId == null) throw new AppException(ErrorCode.USER_NOT_FOUND);

        List<LessonQuestion> questions = lessonQuestionRepository.findByLesson_LessonIdOrderByOrderIndex(lessonId)
                .stream().filter(q -> !q.isDeleted()).collect(Collectors.toList());

        int totalMax = questions.stream().mapToInt(q -> q.getWeight() == null ? 1 : q.getWeight()).sum();
        if (totalMax == 0) totalMax = 1; 

        int totalScore = 0;
        List<LessonProgressWrongItem> currentWrongItems = new ArrayList<>();
        List<String> currentWrongQuestionIds = new ArrayList<>();

        for (LessonQuestion q : questions) {
            String qid = q.getLessonQuestionId().toString();
            Object rawAns = answers.get(qid);
            String userAnswerText = null; byte[] audioBytes = null; byte[] imageBytes = null;
            
            if (rawAns instanceof Map) {
                Map<String, Object> ansMap = (Map<String, Object>) rawAns;
                userAnswerText = (String) ansMap.get("text_answer");
                String audioBase64 = (String) ansMap.get("audio_data");
                String imageBase64 = (String) ansMap.get("image_data");
                if (audioBase64 != null) audioBytes = Base64.getDecoder().decode(audioBase64);
                if (imageBase64 != null) imageBytes = Base64.getDecoder().decode(imageBase64);
            } else if (rawAns != null) { userAnswerText = rawAns.toString(); }

            int scoreGiven = 0; boolean correct = false;
            
            if (q.getQuestionType() == QuestionType.MULTIPLE_CHOICE || q.getQuestionType() == QuestionType.FILL_IN_THE_BLANK || q.getQuestionType() == QuestionType.ORDERING || q.getQuestionType() == QuestionType.TRUE_FALSE || q.getQuestionType() == QuestionType.MATCHING) {
                correct = checkDeterministicAnswer(q, userAnswerText);
                scoreGiven = correct ? (q.getWeight() == null ? 1 : q.getWeight()) : 0;
            } else if (q.getQuestionType() == QuestionType.SPEAKING) {
                scoreGiven = checkSpeakingAnswer(q, token, audioBytes);
                correct = scoreGiven >= (q.getWeight() != null ? q.getWeight() * 0.7 : 70);
            } else if (q.getQuestionType() == QuestionType.WRITING || q.getQuestionType() == QuestionType.ESSAY) {
                scoreGiven = checkWritingAnswer(q, token, userAnswerText, imageBytes);
                correct = scoreGiven >= (q.getWeight() != null ? q.getWeight() * 0.5 : 50); 
            }

            if (correct) { totalScore += scoreGiven; } 
            else {
                LessonProgressWrongItemsId wid = new LessonProgressWrongItemsId(); 
                wid.setLessonId(lessonId); 
                wid.setUserId(userId); 
                wid.setLessonQuestionId(q.getLessonQuestionId()); 
                wid.setAttemptNumber(attemptNumber);
                
                currentWrongItems.add(LessonProgressWrongItem.builder().id(wid).wrongAnswer(userAnswerText).createdAt(OffsetDateTime.now()).updatedAt(OffsetDateTime.now()).isDeleted(false).build());
                currentWrongQuestionIds.add(q.getLessonQuestionId().toString());
            }
        }

        if (!currentWrongItems.isEmpty()) lessonProgressWrongItemRepository.saveAll(currentWrongItems);

        float percent = ((float)totalScore / totalMax) * 100f;
        LessonProgressId pid = new LessonProgressId(lessonId, userId);
        Optional<LessonProgress> existingProgress = lessonProgressRepository.findById(pid);
        boolean alreadyPassed = existingProgress.isPresent() && existingProgress.get().getScore() >= 50.0f;
        
        LessonProgress lp = existingProgress.orElse(LessonProgress.builder().id(pid).score(0.0f).build()); 
        float currentHighestScore = lp.getScore();

        try { 
            lp.setAnswersJson(new ObjectMapper().writeValueAsString(answers)); 
        } catch (Exception ex) { 
            lp.setAnswersJson("{}"); 
        }
        lp.setAttemptNumber(attemptNumber);
        lp.setMaxScore(totalMax);
        lp.setNeedsReview(questions.stream().anyMatch(q -> (q.getQuestionType() == QuestionType.SPEAKING || q.getQuestionType() == QuestionType.WRITING) && (percent < 100)));

        if (percent > currentHighestScore) { 
            lp.setScore(percent);
        } else if (currentHighestScore <= 0 && percent >= 0) {
            lp.setScore(percent);
        }
        
        if (percent >= 50 && lp.getCompletedAt() == null) {
            lp.setCompletedAt(OffsetDateTime.now()); 
        }
        
        lessonProgressRepository.saveAndFlush(lp);

        UserLearningActivity activity = UserLearningActivity.builder()
                .activityId(UUID.randomUUID())
                .userId(userId)
                .activityType(ActivityType.LESSON) 
                .relatedEntityId(lessonId)
                .durationInSeconds(durationSeconds > 0 ? durationSeconds : lesson.getDurationSeconds()) 
                .score(percent)
                .maxScore(100.0f) 
                .details("Completed lesson with score: " + percent)
                .createdAt(OffsetDateTime.now())
                .isDeleted(false)
                .build();
        userLearningActivityRepository.save(activity);
        
        Integer expEarned = 0;
        Integer coinsEarned = 0;
        User user = userRepository.findById(userId).orElse(null);

        if (user != null) {
            user.setLastActiveAt(OffsetDateTime.now());
            if (percent >= 50 && !alreadyPassed) {
               expEarned = lesson.getExpReward();
               coinsEarned = lesson.getExpReward();
               user.setExp(user.getExp() + expEarned);
               user.setCoins(user.getCoins() + coinsEarned); 
            }
            userRepository.save(user);
            syncLeaderboardData(user, percent >= 50 && !alreadyPassed ? expEarned : 0);
        }

        runIsolatedSideEffects(userId, lessonId, percent, lesson.getSkillTypes(), durationSeconds > 0 ? durationSeconds : lesson.getDurationSeconds());

        Map<String, Object> result = new HashMap<>();
        result.put("lessonId", lessonId); 
        result.put("totalScore", totalScore); 
        result.put("maxScore", totalMax); 
        result.put("percent", percent); 
        result.put("needsReview", lp.getNeedsReview()); 
        result.put("progressPercent", computeProgressVsUserGoal(userId, lesson, percent));
        result.put("expEarned", expEarned);
        result.put("coinsEarned", coinsEarned);
        result.put("wrongQuestionIds", currentWrongQuestionIds);
        
        return result;
    }

    private void runIsolatedSideEffects(UUID userId, UUID lessonId, float percent, SkillType skill, int duration) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        
        try {
            template.execute(status -> {
                List<CourseVersionLesson> linkedVersions = courseVersionLessonRepository.findByLesson_LessonId(lessonId);
                if (linkedVersions != null) {
                    for (CourseVersionLesson cvl : linkedVersions) {
                        try {
                            courseEnrollmentService.syncEnrollmentProgress(userId, cvl.getCourseVersion().getVersionId());
                        } catch (Exception ignored) {}
                    }
                }

                if (percent >= 80) { 
                    dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LESSON_COMPLETED, 1);
                    badgeService.updateBadgeProgress(userId, BadgeType.LESSON_COUNT, 1);
                    ChallengeType skillChallenge = mapSkillToChallengeType(skill);
                    if (skillChallenge != null) dailyChallengeService.updateChallengeProgress(userId, skillChallenge, 1);
                }
                
                int minutes = duration / 60;
                if (minutes > 0) {
                    dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LEARNING_TIME, minutes);
                }
                return null;
            });
        } catch (Exception e) {
            log.warn("Isolated side effects failed: {}", e.getMessage());
        }
    }
    
    private void syncLeaderboardData(User user, int expEarned) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        
        try {
            template.execute(status -> {
                try {
                    List<Leaderboard> allLeaderboards = leaderboardRepository.findAllByIsDeletedFalse();
                    for (Leaderboard lb : allLeaderboards) {
                        LeaderboardEntry entry = leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(lb.getLeaderboardId(), user.getUserId())
                            .orElseGet(() -> {
                                LeaderboardEntry newEntry = new LeaderboardEntry();
                                newEntry.setLeaderboardEntryId(new LeaderboardEntryId(lb.getLeaderboardId(), user.getUserId()));
                                newEntry.setLeaderboard(lb);
                                newEntry.setUser(user);
                                newEntry.setScore(0);
                                newEntry.setDeleted(false);
                                return newEntry;
                            });

                        boolean isUpdated = false;
                        if ("global".equalsIgnoreCase(lb.getTab()) || "country".equalsIgnoreCase(lb.getTab())) {
                            entry.setExp(user.getExp()); 
                            entry.setLevel(user.getLevel());
                            entry.setScore(entry.getScore() + expEarned); 
                            isUpdated = true;
                        }
                        else if ("coins".equalsIgnoreCase(lb.getTab())) {
                            entry.setScore(user.getCoins()); 
                            isUpdated = true;
                        }

                        if (isUpdated) {
                            leaderboardEntryRepository.save(entry);
                        }
                    }
                } catch (Exception e) {
                    log.error("Failed to sync leaderboard for user {}: {}", user.getUserId(), e.getMessage());
                    status.setRollbackOnly();
                }
                return null;
            });
        } catch (Exception e) {
             log.warn("Leaderboard sync failed silently: {}", e.getMessage());
        }
    }

    private ChallengeType mapSkillToChallengeType(SkillType skill) {
        if (skill == null) return null;
        return switch (skill) {
            case SPEAKING -> ChallengeType.SPEAKING_PRACTICE;
            case LISTENING -> ChallengeType.LISTENING_PRACTICE;
            case READING -> ChallengeType.READING_COMPREHENSION;
            case WRITING -> ChallengeType.VOCABULARY_REVIEW;
            default -> null;
        };
    }

    private boolean checkDeterministicAnswer(LessonQuestion q, String userAnswerText) {
        if (userAnswerText == null || q.getCorrectOption() == null) return false;
        String correctAnswer = q.getCorrectOption().trim().toLowerCase();
        String got = userAnswerText.trim().toLowerCase();

        if (q.getQuestionType() == QuestionType.MULTIPLE_CHOICE || q.getQuestionType() == QuestionType.ORDERING) {
            return got.equalsIgnoreCase(correctAnswer);
        } 
        if (q.getQuestionType() == QuestionType.FILL_IN_THE_BLANK) {
            List<String> validOptions = Arrays.stream(correctAnswer.split("\\|\\|"))
                .map(String::trim)
                .map(String::toLowerCase)
                .collect(Collectors.toList());
            return validOptions.contains(got);
        }
        if (q.getQuestionType() == QuestionType.MATCHING) {
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
            mimeType = (q.getSkillType() == SkillType.LISTENING) ? "audio/mpeg" : "image/jpeg";
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
        Lesson lesson = lessonRepository.findById(lessonId).filter(l -> !l.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        
        LessonProgress progress = LessonProgress.builder()
                .id(new LessonProgressId(lessonId, userId))
                .score(score != null ? score.floatValue() : 0.0f) 
                .completedAt(OffsetDateTime.now())
                .build();
        
        lessonProgressRepository.saveAndFlush(progress);

        UserLearningActivity activity = UserLearningActivity.builder()
                .userId(userId)
                .activityType(ActivityType.LESSON_COMPLETE)
                .relatedEntityId(lessonId)
                .durationInSeconds(lesson.getDurationSeconds())
                .score(score != null ? score.floatValue() : 0.0f)
                .maxScore(100.0f)
                .createdAt(OffsetDateTime.now())
                .isDeleted(false)
                .build();
        userLearningActivityRepository.save(activity);

        userService.updateExp(userId, lesson.getExpReward());
        runIsolatedSideEffects(userId, lessonId, score != null ? score.floatValue() : 0.0f, lesson.getSkillTypes(), lesson.getDurationSeconds());
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
            if (categoryId != null && !lessonCategoryRepository.existsById(categoryId)) throw new AppException(ErrorCode.LESSON_CATEGORY_NOT_FOUND);
            if (subCategoryId != null && !lessonSubCategoryRepository.existsById(subCategoryId)) throw new AppException(ErrorCode.LESSON_SUB_CATEGORY_NOT_FOUND);

            Specification<Lesson> spec = (root, query, cb) -> {
                query.distinct(true);
                List<Predicate> predicates = new ArrayList<>();
                if (categoryId != null) predicates.add(cb.equal(root.get("lessonCategoryId"), categoryId));
                if (subCategoryId != null) predicates.add(cb.equal(root.get("lessonSubCategoryId"), subCategoryId));
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
        SkillType skillType = lesson.getSkillTypes();
        List<String> videoUrls = videoRepository.findByLessonIdAndIsDeletedFalse(lesson.getLessonId())
                .stream().map(Video::getVideoUrl).collect(Collectors.toList());

        LessonResponse response = lessonMapper.toResponse(lesson);
        response.setSkillTypes(skillType != null ? skillType : SkillType.READING);
        response.setVideoUrls(videoUrls);
        return response;
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
        if (lesson.getLessonName() == null) lesson.setLessonName("Untitled Lesson " + UUID.randomUUID());
        lesson.setDeleted(false);
        Lesson savedLesson = lessonRepository.save(lesson);

        CourseVersionLessonId linkId = new CourseVersionLessonId(versionId, savedLesson.getLessonId());
        CourseVersionLesson courseVersionLesson = CourseVersionLesson.builder()
                .id(linkId)
                .orderIndex(lessonIndex != null ? lessonIndex : 0)
                .build();
        courseVersionLessonRepository.save(courseVersionLesson);
        return savedLesson;
    }

    @Override
    public QuizResponse generateTeamQuiz(String token, String topic) {
        try {
            QuizGenerationResponse grpcResponse = grpcClientService.generateLanguageQuiz(token, null, 30, "team", topic).get();
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
            QuizGenerationResponse grpcResponse = grpcClientService.generateLanguageQuiz(token, userId.toString(), 15, "solo", null).get();
            return quizQuestionMapper.toResponse(grpcResponse);
        } catch (InterruptedException | ExecutionException e) {
            if (e.getCause() instanceof AppException appEx) throw appEx;
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @Override
    @Transactional
    public void deleteLesson(UUID id) {
        Lesson lesson = lessonRepository.findById(id).filter(l -> !l.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        lesson.setDeleted(true);
        lesson.setDeletedAt(OffsetDateTime.now());
        lessonRepository.save(lesson);
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
}