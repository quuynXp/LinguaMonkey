package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.UserLearningActivityMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLearningActivityServiceImpl implements UserLearningActivityService {

    private final UserLearningActivityRepository userLearningActivityRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final UserLearningActivityMapper userLearningActivityMapper;
    private final DailyChallengeService dailyChallengeService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final GrpcClientService grpcClientService;

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

        // 1. Log Activity to DB
        UserLearningActivityResponse activityLog = logUserActivity(
                request.getUserId(),
                request.getActivityType(),
                request.getRelatedEntityId(),
                request.getDurationInSeconds(),
                expReward,
                details,
                skillType
        );

        // 2. Update User Coins/Exp & STREAK LOGIC
        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user != null) {
            user.setExp(user.getExp() + expReward);
            user.setCoins(user.getCoins() + expReward);
            user.setLastActiveAt(OffsetDateTime.now());

            // --- STREAK INCREMENT LOGIC ---
            LocalDate today = LocalDate.now(VN_ZONE);
            Long minGoal = user.getMinLearningDurationMinutes() != 0 ? (long) user.getMinLearningDurationMinutes() : 15L;
            
            // Calculate total including the activity just saved
            Long totalDurationToday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(user.getUserId(), today);
            if (totalDurationToday == null) totalDurationToday = 0L;

            if (totalDurationToday >= minGoal) {
                // FIXED: lastStreakCheckDate is LocalDate, no need for timezone conversion
                LocalDate lastCheck = user.getLastStreakCheckDate();

                if (lastCheck == null || !lastCheck.equals(today)) {
                    user.setStreak(user.getStreak() + 1);
                    // FIXED: Set LocalDate (today) instead of OffsetDateTime
                    user.setLastStreakCheckDate(today);
                    log.info("Streak incremented for user {}. New Streak: {}", user.getUserId(), user.getStreak());
                }
            }
            // ------------------------------

            userRepository.save(user);
        }
        
        // 3. Invalidate cache
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":week");
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":month");
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":year");
        
        // 4. Update Challenges
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

    // --- MAIN STATS LOGIC ---

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

        // 1. Fetch Data
        List<UserLearningActivity> activities = userLearningActivityRepository.findByUserIdAndCreatedAtBetween(userId, startOdt, endOdt);
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Current Metrics
        long currentTotalTime = activities.stream().mapToLong(a -> a.getDurationInSeconds() != null ? a.getDurationInSeconds() : 0).sum();
        int currentLessons = (int) activities.stream().filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETED).count();
        // Calculate Weighted Accuracy
        double totalScore = activities.stream().mapToDouble(a -> a.getScore() != null ? a.getScore() : 0).sum();
        double totalMaxScore = activities.stream().mapToDouble(a -> a.getMaxScore() != null ? a.getMaxScore() : 0).sum();
        double currentAccuracy = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100.0 : 0.0;

        // 3. Previous Metrics (For Comparison)
        long prevTotalTime = userLearningActivityRepository.sumDurationByUserIdAndDateRange(userId, prevStartOdt, startOdt);
        double prevAccuracy = userLearningActivityRepository.calculateAverageAccuracy(userId, prevStartOdt, startOdt);
        
        double timeGrowth = prevTotalTime == 0 ? (currentTotalTime > 0 ? 100.0 : 0.0) : ((double)(currentTotalTime - prevTotalTime) / prevTotalTime) * 100;
        double accuracyGrowth = prevAccuracy == 0 ? (currentAccuracy > 0 ? 100.0 : 0.0) : ((currentAccuracy - prevAccuracy) / prevAccuracy) * 100;

        // 4. Find Weakest Skill
        List<Object[]> weakSkills = userLearningActivityRepository.findWeakestSkills(userId, startOdt, endOdt);
        String weakestSkill = weakSkills.isEmpty() ? "NONE" : weakSkills.get(0)[0].toString();

        // 5. Build Charts
        List<StatsResponse.ChartDataPoint> timeChart = new ArrayList<>();
        List<StatsResponse.ChartDataPoint> accuracyChart = new ArrayList<>();
        
        Map<LocalDate, Long> dailyTime = new HashMap<>();
        Map<LocalDate, List<Double>> dailyAccuracy = new HashMap<>();

        for (UserLearningActivity a : activities) {
            LocalDate d = a.getCreatedAt().toLocalDate();
            dailyTime.merge(d, a.getDurationInSeconds() != null ? a.getDurationInSeconds() : 0L, Long::sum);
            if (a.getMaxScore() != null && a.getMaxScore() > 0) {
                dailyAccuracy.computeIfAbsent(d, k -> new ArrayList<>()).add((double)a.getScore()/a.getMaxScore() * 100);
            }
        }

        LocalDate temp = startDate;
        DateTimeFormatter labelFormatter = period.equals("year") ? DateTimeFormatter.ofPattern("MM/yy") : DateTimeFormatter.ofPattern("dd/MM");
        
        while (!temp.isAfter(endDate)) {
            String label = temp.format(labelFormatter);
            long timeVal = dailyTime.getOrDefault(temp, 0L);
            List<Double> accList = dailyAccuracy.getOrDefault(temp, Collections.emptyList());
            double accVal = accList.isEmpty() ? 0.0 : accList.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

            timeChart.add(new StatsResponse.ChartDataPoint(label, (double)timeVal / 60.0, temp.toString()));
            accuracyChart.add(new StatsResponse.ChartDataPoint(label, accVal, temp.toString()));
            
            temp = period.equals("year") ? temp.plusMonths(1) : temp.plusDays(1);
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
                .build();
    }

    // --- REAL AI LOGIC (TRIGGERED BY SCHEDULER) ---
    
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generateDailyAnalysisForUser(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime yesterday = now.minusDays(1);
        
        // 1. Get Real Data from yesterday/today
        List<UserLearningActivity> recentActivities = userLearningActivityRepository.findByUserIdAndCreatedAtBetween(userId, yesterday, now);
        
        if (recentActivities.isEmpty()) return;

        double totalScore = 0;
        double totalMax = 0;
        int totalSeconds = 0;
        Set<String> weakSpots = new HashSet<>();
        
        for (UserLearningActivity a : recentActivities) {
            if (a.getDurationInSeconds() != null) totalSeconds += a.getDurationInSeconds();
            if (a.getMaxScore() != null && a.getMaxScore() > 0) {
                totalScore += a.getScore();
                totalMax += a.getMaxScore();
                if ((double)a.getScore()/a.getMaxScore() < 0.6) {
                    weakSpots.add(a.getActivityType().toString());
                }
            }
        }
        
        double accuracy = totalMax > 0 ? (totalScore / totalMax * 100) : 0;
        int minutes = totalSeconds / 60;
        String weakAreasStr = weakSpots.isEmpty() ? "None" : String.join(", ", weakSpots);
        
        // 2. Construct Real Prompt for AI
        String prompt = String.format(
            "Analyze this language learner's daily progress and give a short, encouraging 1-sentence tip. " +
            "Data: Learned %d minutes today. Accuracy: %.1f%%. Struggled with: %s. " +
            "Language: %s. Proficiency: %s.",
            minutes, accuracy, weakAreasStr, 
            user.getNativeLanguageCode() != null ? "Vietnamese" : "English", 
            user.getProficiency() != null ? user.getProficiency().toString() : "Beginner"
        );
        
        // 3. Call gRPC -> Python -> Gemini
        try {
            grpcClientService.callChatWithAIAsync(null, userId.toString(), prompt, new ArrayList<>())
                .thenAccept(suggestion -> {
                    if (suggestion != null && !suggestion.isEmpty()) {
                        user.setLatestImprovementSuggestion(suggestion);
                        user.setLastSuggestionGeneratedAt(OffsetDateTime.now());
                        userRepository.save(user);
                    }
                });
        } catch (Exception e) {
            log.error("Error calling AI for user analysis: {}", e.getMessage());
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordHeartbeat(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Heartbeat received for unknown user ID: {}", userId);
            return;
        }

        user.setLastActiveAt(OffsetDateTime.now());
        userRepository.save(user);

        String todayStr = LocalDate.now().toString();
        String key = ONLINE_TIME_KEY + userId + ":" + todayStr;
        
        redisTemplate.opsForValue().increment(key, 1);
        redisTemplate.expire(key, 30, TimeUnit.DAYS);

        log.debug("Heartbeat recorded for user: {} minute count key: {}", userId, key);
    }
}