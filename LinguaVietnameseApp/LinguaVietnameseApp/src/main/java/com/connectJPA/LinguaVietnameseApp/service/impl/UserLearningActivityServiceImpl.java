package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.UserLearningActivityMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLearningActivityServiceImpl implements UserLearningActivityService {

    private final UserLearningActivityRepository userLearningActivityRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final UserLearningActivityMapper userLearningActivityMapper;
    private final DailyChallengeService dailyChallengeService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final GrpcClientService grpcClientService;
    private final CourseRepository courseRepository; 
    private final NotificationService notificationService;

    private static final String HISTORY_CACHE_KEY = "user:history:";
    private static final String ONLINE_TIME_KEY = "user:online_minutes:";
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Override
    public Page<UserLearningActivityResponse> getAllUserLearningActivities(UUID userId, Pageable pageable) {
        Page<UserLearningActivity> activities = userLearningActivityRepository.findByUserIdAndIsDeletedFalse(userId, pageable);
        return activities.map(userLearningActivityMapper::toUserLearningActivityResponse);
    }

    @Override
    public UserLearningActivityResponse getUserLearningActivityById(UUID id) {
        UserLearningActivity activity = userLearningActivityRepository.findByActivityIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User learning activity not found"));
        return userLearningActivityMapper.toUserLearningActivityResponse(activity);
    }

    @Override
    @Transactional
    public ActivityCompletionResponse logActivityEndAndCheckChallenges(LearningActivityEventRequest request) {
        if (request.getDurationInSeconds() == null) {
             request.setDurationInSeconds(0);
        }

        int expReward = 0;
        String details = request.getDetails();
        SkillType skillType = null;

        if (request.getActivityType() == ActivityType.LESSON_COMPLETED && request.getRelatedEntityId() != null) {
            Lesson lesson = lessonRepository.findById(request.getRelatedEntityId()).orElse(null);
            if (lesson != null) {
                expReward = lesson.getExpReward();
                skillType = lesson.getSkillTypes();
            }
        }

        UserLearningActivityResponse activityLog = logUserActivity(
                request.getUserId(),
                request.getActivityType(),
                request.getRelatedEntityId(),
                request.getDurationInSeconds(),
                expReward,
                details,
                skillType
        );

        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user != null) {
            user.setExp(user.getExp() + expReward);
            user.setCoins(user.getCoins() + expReward);
            user.setLastActiveAt(OffsetDateTime.now());

            LocalDate today = LocalDate.now(VN_ZONE);
            Long minGoal = user.getMinLearningDurationMinutes() != 0 ? (long) user.getMinLearningDurationMinutes() : 15L;
            
            Long totalDurationToday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(user.getUserId(), today);
            if (totalDurationToday == null) totalDurationToday = 0L;
            
            String redisKey = ONLINE_TIME_KEY + user.getUserId() + ":" + today.toString();
            Object redisVal = redisTemplate.opsForValue().get(redisKey);
            long onlineMinutes = redisVal != null ? Long.parseLong(redisVal.toString()) : 0L;
            
            long effectiveMinutes = Math.max(totalDurationToday, onlineMinutes);

            if (effectiveMinutes >= minGoal) {
                LocalDate lastCheck = user.getLastStreakCheckDate();
                if (lastCheck == null || !lastCheck.equals(today)) {
                    user.setStreak(user.getStreak() + 1);
                    user.setLastStreakCheckDate(today);
                    log.info("Streak incremented for user {}. New Streak: {}", user.getUserId(), user.getStreak());
                }
            }
            userRepository.save(user);
        }
        
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":week");
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":month");
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":year");
        
        DailyChallengeUpdateResponse challengeUpdate = null;
        UUID userId = request.getUserId();

        if (request.getDurationInSeconds() > 0) {
            dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LEARNING_TIME, request.getDurationInSeconds() / 60);
        }

        switch (request.getActivityType()) {
            case LESSON_COMPLETED -> challengeUpdate = dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LESSON_COMPLETED, 1);
            case SPEAKING -> challengeUpdate = dailyChallengeService.updateChallengeProgress(userId, ChallengeType.SPEAKING_PRACTICE, 1);
            case LISTENING -> challengeUpdate = dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LISTENING_PRACTICE, 1);
            case READING -> challengeUpdate = dailyChallengeService.updateChallengeProgress(userId, ChallengeType.READING_COMPREHENSION, 1);
            case FLASHCARD_REVIEW -> challengeUpdate = dailyChallengeService.updateChallengeProgress(userId, ChallengeType.VOCABULARY_REVIEW, 1);
            case TEST -> challengeUpdate = dailyChallengeService.updateChallengeProgress(userId, ChallengeType.REVIEW_SESSION, 1);
            default -> {}
        }

        return ActivityCompletionResponse.builder()
                .activityLog(activityLog)
                .challengeUpdate(challengeUpdate)
                .build();
    }

    @Override
    @Transactional
    public UserLearningActivityResponse logUserActivity(UUID userId, ActivityType activityType, UUID relatedEntityId, Integer durationInSeconds, int expReward, String details, SkillType skillTypes) {
        if (userId == null || activityType == null) {
            throw new IllegalArgumentException("UserId and ActivityType are required");
        }

        UserLearningActivity activity = new UserLearningActivity();
        activity.setActivityId(UUID.randomUUID());
        activity.setUserId(userId);
        activity.setActivityType(activityType);
        activity.setRelatedEntityId(relatedEntityId); 
        activity.setDurationInSeconds(durationInSeconds != null ? durationInSeconds : 0); 
        activity.setDetails(details); 
        activity.setCreatedAt(OffsetDateTime.now());
        
        activity = userLearningActivityRepository.save(activity);
        return userLearningActivityMapper.toUserLearningActivityResponse(activity);
    }

    @Override
    @Transactional
    public UserLearningActivityResponse createUserLearningActivity(UserLearningActivityRequest request) {
        Lesson lesson = lessonRepository.findById(request.getRelatedEntityId())
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        return logUserActivity(
                request.getUserId(),
                request.getActivityType(),
                request.getRelatedEntityId(),
                request.getDurationInSeconds(),
                lesson.getExpReward(),
                request.getDetails(),
                lesson.getSkillTypes()
        );
    }

    @Override
    @Transactional
    public UserLearningActivityResponse updateUserLearningActivity(UUID id, UserLearningActivityRequest request) {
        UserLearningActivity activity = userLearningActivityRepository.findByActivityIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User learning activity not found"));
        userLearningActivityMapper.updateEntityFromRequest(request, activity);
        activity = userLearningActivityRepository.save(activity);
        return userLearningActivityMapper.toUserLearningActivityResponse(activity);
    }

    @Override
    @Transactional
    public void deleteUserLearningActivity(UUID id) {
        userLearningActivityRepository.softDeleteById(id);
    }

    @Override
    public StudyHistoryResponse getAggregatedStudyHistory(UUID userId, String period) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate;
        LocalDate prevStartDate;

        switch (period.toLowerCase()) {
            case "week" -> {
                startDate = endDate.minusDays(6);
                prevStartDate = startDate.minusDays(7);
            }
            case "year" -> {
                startDate = endDate.minusMonths(11);
                prevStartDate = startDate.minusMonths(12);
            }
            case "month" -> {
                startDate = endDate.minusDays(29);
                prevStartDate = startDate.minusDays(30);
            }
            default -> {
                startDate = endDate.minusDays(29); 
                prevStartDate = startDate.minusDays(30);
            }
        }

        OffsetDateTime startOdt = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endOdt = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime prevStartOdt = prevStartDate.atStartOfDay().atOffset(ZoneOffset.UTC);

        List<UserLearningActivity> activities = userLearningActivityRepository.findByUserIdAndCreatedAtBetween(userId, startOdt, endOdt);
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        long currentTotalTime = activities.stream().mapToLong(a -> a.getDurationInSeconds() != null ? a.getDurationInSeconds() : 0).sum();
        int currentLessons = (int) activities.stream().filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETED).count();
        
        double totalScore = activities.stream().mapToDouble(a -> a.getScore() != null ? a.getScore() : 0).sum();
        double totalMaxScore = activities.stream().mapToDouble(a -> a.getMaxScore() != null ? a.getMaxScore() : 0).sum();
        double currentAccuracy = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100.0 : 0.0;

        long prevTotalTime = userLearningActivityRepository.sumDurationByUserIdAndDateRange(userId, prevStartOdt, startOdt);
        double prevAccuracy = userLearningActivityRepository.calculateAverageAccuracy(userId, prevStartOdt, startOdt);
        
        double timeGrowth = prevTotalTime == 0 ? (currentTotalTime > 0 ? 100.0 : 0.0) : ((double)(currentTotalTime - prevTotalTime) / prevTotalTime) * 100;
        double accuracyGrowth = prevAccuracy == 0 ? (currentAccuracy > 0 ? 100.0 : 0.0) : ((currentAccuracy - prevAccuracy) / prevAccuracy) * 100;

        List<Object[]> weakSkills = userLearningActivityRepository.findWeakestSkills(userId, startOdt, endOdt);
        String weakestSkill = weakSkills.isEmpty() ? "NONE" : weakSkills.get(0)[0].toString();

        List<StatsResponse.ChartDataPoint> timeChart = new ArrayList<>();
        List<StatsResponse.ChartDataPoint> accuracyChart = new ArrayList<>();
        Map<String, Integer> dailyHeatmap = new HashMap<>(); 
        
        Map<LocalDate, Long> dbDailyTime = new HashMap<>();
        Map<LocalDate, List<Double>> dailyAccuracy = new HashMap<>();

        for (UserLearningActivity a : activities) {
            LocalDate d = a.getCreatedAt().toLocalDate();
            dbDailyTime.merge(d, a.getDurationInSeconds() != null ? a.getDurationInSeconds() : 0L, Long::sum);
            if (a.getMaxScore() != null && a.getMaxScore() > 0) {
                dailyAccuracy.computeIfAbsent(d, k -> new ArrayList<>()).add((double)a.getScore()/a.getMaxScore() * 100);
            }
        }

        LocalDate temp = startDate;
        DateTimeFormatter labelFormatter = period.equals("year") ? DateTimeFormatter.ofPattern("MM/yy") : DateTimeFormatter.ofPattern("dd/MM");
        
        while (!temp.isAfter(endDate)) {
            String dateStr = temp.toString();
            String redisKey = ONLINE_TIME_KEY + userId + ":" + dateStr;
            
            Object redisValObj = redisTemplate.opsForValue().get(redisKey);
            long redisMinutes = redisValObj != null ? Long.parseLong(redisValObj.toString()) : 0L;
            
            long dbSeconds = dbDailyTime.getOrDefault(temp, 0L);
            long dbMinutes = dbSeconds / 60;

            long finalMinutes = Math.max(redisMinutes, dbMinutes);
            dailyHeatmap.put(dateStr, (int) finalMinutes);

            String label = temp.format(labelFormatter);
            List<Double> accList = dailyAccuracy.getOrDefault(temp, Collections.emptyList());
            double accVal = accList.isEmpty() ? 0.0 : accList.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

            timeChart.add(new StatsResponse.ChartDataPoint(label, (double)finalMinutes, temp.toString()));
            accuracyChart.add(new StatsResponse.ChartDataPoint(label, accVal, temp.toString()));
            
            temp = temp.plusDays(1);
        }

        StatsResponse stats = StatsResponse.builder()
                .totalSessions(activities.size())
                .totalTimeSeconds(currentTotalTime)
                .totalCoins(user.getCoins()) 
                .totalExperience(user.getExp())
                .lessonsCompleted(currentLessons)
                .averageScore(currentAccuracy) 
                .timeGrowthPercent(timeGrowth)
                .accuracyGrowthPercent(accuracyGrowth)
                .coinsGrowthPercent(0.0) 
                .weakestSkill(weakestSkill)
                .improvementSuggestion(user.getLatestImprovementSuggestion())
                .timeChartData(timeChart)
                .accuracyChartData(accuracyChart)
                .build();

        List<StudySessionResponse> sessionList = activities.stream()
                .sorted(Comparator.comparing(UserLearningActivity::getCreatedAt).reversed())
                .map(userLearningActivityMapper::toStudySessionResponse)
                .collect(Collectors.toList());

        return StudyHistoryResponse.builder()
                .sessions(sessionList)
                .stats(stats)
                .dailyActivity(dailyHeatmap)
                .build();
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generateDailyAnalysisForUser(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime yesterdayStart = now.minusDays(1).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime yesterdayEnd = now.toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);

        // 1. FILTER: Only process users who were active yesterday
        boolean activeYesterday = userLearningActivityRepository.existsByUserIdAndCreatedAtBetween(userId, yesterdayStart, yesterdayEnd);
        boolean onlineYesterday = checkRedisActivity(userId, now.minusDays(1).toLocalDate());

        if (!activeYesterday && !onlineYesterday) {
            log.info("Skipping analysis for user {} (Inactive yesterday)", userId);
            return;
        }

        // 2. CONTEXT: Fetch available public courses for the user's current or next level
        ProficiencyLevel currentLevel = user.getProficiency() != null ? user.getProficiency() : ProficiencyLevel.A1;
        ProficiencyLevel nextLevel = getNextLevel(currentLevel);
        DifficultyLevel diffLevel = mapProficiencyToDifficulty(nextLevel);
        
        // Find candidate courses to suggest (Public, Matching Next Level)
        List<Course> candidateCourses = courseRepository.findByLatestPublicVersion_DifficultyLevelAndApprovalStatus(
            diffLevel, 
            com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus.APPROVED
        );

        String candidateCoursesText = candidateCourses.stream()
            .limit(5) // Limit context size
            .map(c -> "- " + c.getTitle() + " (" + c.getLatestPublicVersion().getDifficultyLevel() + ")")
            .collect(Collectors.joining("\n"));

        // 3. PROMPT: Construct detailed prompt for Gemini
        String prompt = String.format(
            "Analyze this user's learning data (provided in context). They are currently at level %s.\n" +
            "1. Evaluate their roadmap progress and course enrollments.\n" +
            "2. If they have completed most requirements for %s, check if they are ready for %s.\n" +
            "3. Suggest specific improvements based on their weak skills.\n" +
            "4. Recommend one of these available courses if suitable:\n%s\n\n" +
            "Format output:\n" +
            "Provide a short, encouraging 2-sentence tip for the user.\n" +
            "IF AND ONLY IF the user is clearly ready for the next level based on high accuracy/completion, append exactly: '[LEVEL_UP: %s]'.",
            currentLevel, currentLevel, nextLevel, candidateCoursesText, nextLevel
        );

        try {
            // 4. CALL AI
            grpcClientService.callChatWithAIAsync(null, userId.toString(), prompt, new ArrayList<>())
                .thenAccept(suggestion -> {
                    if (suggestion != null && !suggestion.isEmpty()) {
                        
                        // 5. LOGIC: Check for Level Up Trigger
                        if (suggestion.contains("[LEVEL_UP:")) {
                            updateUserLevel(user, suggestion);
                            // Remove the technical tag from the message shown to user
                            suggestion = suggestion.replaceAll("\\[LEVEL_UP:.*?\\]", "").trim();
                        }

                        // Save suggestion to DB for UI display
                        user.setLatestImprovementSuggestion(suggestion);
                        user.setLastSuggestionGeneratedAt(OffsetDateTime.now());
                        userRepository.save(user);

                        // 6. NOTIFICATION: Push to user
                        NotificationRequest notifRequest = NotificationRequest.builder()
                                .userId(userId)
                                .title("Daily AI Coach \uD83E\uDD16") // Robot emoji
                                .content(suggestion)
                                .type("AI_SUGGESTION")
                                .build();
                        notificationService.createPushNotification(notifRequest);
                    }
                });
        } catch (Exception e) {
            log.error("Error calling AI for user analysis: {}", e.getMessage());
        }
    }

    private boolean checkRedisActivity(UUID userId, LocalDate date) {
        String redisKey = ONLINE_TIME_KEY + userId + ":" + date.toString();
        Object val = redisTemplate.opsForValue().get(redisKey);
        return val != null && Long.parseLong(val.toString()) > 0;
    }

    private ProficiencyLevel getNextLevel(ProficiencyLevel current) {
        return switch (current) {
            case A1 -> ProficiencyLevel.A2;
            case A2 -> ProficiencyLevel.B1;
            case B1 -> ProficiencyLevel.B2;
            case B2 -> ProficiencyLevel.C1;
            case C1 -> ProficiencyLevel.C2;
            default -> ProficiencyLevel.A1;
        };
    }

    private DifficultyLevel mapProficiencyToDifficulty(ProficiencyLevel level) {
        return switch (level) {
            case A1, A2 -> DifficultyLevel.BEGINNER;
            case B1, B2 -> DifficultyLevel.INTERMEDIATE;
            case C1, C2 -> DifficultyLevel.ADVANCED;
            default -> DifficultyLevel.BEGINNER;
        };
    }

    private void updateUserLevel(User user, String aiResponse) {
        Pattern pattern = Pattern.compile("\\[LEVEL_UP:\\s*([A-Z0-9]+)\\]");
        Matcher matcher = pattern.matcher(aiResponse);
        if (matcher.find()) {
            String newLevelStr = matcher.group(1);
            try {
                ProficiencyLevel newLevel = ProficiencyLevel.valueOf(newLevelStr);
                user.setProficiency(newLevel);
                log.info("User {} auto-upgraded to level {} by AI Analysis.", user.getUserId(), newLevel);
                
                // Send specific congratulation notification
                NotificationRequest levelUpNotif = NotificationRequest.builder()
                        .userId(user.getUserId())
                        .title("Level Up! \uD83C\uDF89")
                        .content("Congratulations! Based on your recent progress, you have been promoted to " + newLevel + "!")
                        .type("LEVEL_UP")
                        .build();
                notificationService.createPushNotification(levelUpNotif);
                
            } catch (IllegalArgumentException e) {
                log.warn("AI suggested invalid level: {}", newLevelStr);
            }
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordHeartbeat(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }

        user.setLastActiveAt(OffsetDateTime.now());
        userRepository.save(user);

        String todayStr = LocalDate.now().toString();
        String key = ONLINE_TIME_KEY + userId + ":" + todayStr;
        
        redisTemplate.opsForValue().increment(key, 1);
        redisTemplate.expire(key, 30, TimeUnit.DAYS);
    }
}