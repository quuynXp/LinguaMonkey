package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
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
    private final LeaderboardEntryRepository leaderboardEntryRepository;
    private final LeaderboardRepository leaderboardRepository;

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
            OffsetDateTime startOfDay = today.atStartOfDay(VN_ZONE).toOffsetDateTime();
            OffsetDateTime endOfDay = today.plusDays(1).atStartOfDay(VN_ZONE).toOffsetDateTime();

            Long totalDurationSecondsToday = userLearningActivityRepository.sumDurationByUserIdAndDateRange(user.getUserId(), startOfDay, endOfDay);
            if (totalDurationSecondsToday == null) totalDurationSecondsToday = 0L;
            long totalDurationMinutes = (long) Math.ceil(totalDurationSecondsToday / 60.0);

            Long minGoal = user.getMinLearningDurationMinutes() != 0 ? (long) user.getMinLearningDurationMinutes() : 15L;
            String redisKey = ONLINE_TIME_KEY + user.getUserId() + ":" + today.toString();
            Object redisVal = redisTemplate.opsForValue().get(redisKey);
            long onlineMinutes = redisVal != null ? Long.parseLong(redisVal.toString()) : 0L;
            
            long effectiveMinutes = Math.max(totalDurationMinutes, onlineMinutes);

            if (effectiveMinutes >= minGoal) {
                LocalDate lastCheck = user.getLastStreakCheckDate();
                if (lastCheck == null || !lastCheck.equals(today)) {
                    user.setStreak(user.getStreak() + 1);
                    user.setLastStreakCheckDate(today);
                }
            }
            userRepository.save(user);

            syncLeaderboardData(user, expReward);
        }
        
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":week");
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":month");
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":year");
        
        DailyChallengeUpdateResponse challengeUpdate = null;
        UUID userId = request.getUserId();

        if (request.getDurationInSeconds() > 0) {
            int minutesToAdd = (int) Math.ceil(request.getDurationInSeconds() / 60.0);
            dailyChallengeService.updateChallengeProgress(userId, ChallengeType.LEARNING_TIME, minutesToAdd);
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

    private void syncLeaderboardData(User user, int expEarned) {
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

                if ("global".equalsIgnoreCase(lb.getTab())) {
                    entry.setExp(user.getExp());
                    entry.setLevel(user.getLevel());
                    entry.setScore(entry.getScore() + expEarned); 
                    isUpdated = true;
                }
                else if ("coins".equalsIgnoreCase(lb.getTab())) {
                    entry.setScore(user.getCoins()); 
                    isUpdated = true;
                }
                else if ("country".equalsIgnoreCase(lb.getTab())) {
                      entry.setExp(user.getExp());
                      entry.setScore(entry.getScore() + expEarned);
                      isUpdated = true;
                }

                if (isUpdated) {
                    leaderboardEntryRepository.save(entry);
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync leaderboard for user {}: {}", user.getUserId(), e.getMessage());
        }
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
        activity.setScore((float) expReward); 
        activity.setMaxScore((float) expReward);
        
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
        
        boolean groupByMonth = "year".equalsIgnoreCase(period);

        switch (period.toLowerCase()) {
            case "week" -> {
                startDate = endDate.minusDays(6);
                prevStartDate = startDate.minusDays(7);
            }
            case "year" -> {
                startDate = endDate.minusMonths(11).withDayOfMonth(1); 
                prevStartDate = startDate.minusYears(1);
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

        List<ChartDataPoint> timeChart = new ArrayList<>();
        List<ChartDataPoint> accuracyChart = new ArrayList<>();
        Map<String, Integer> dailyHeatmap = new HashMap<>(); 
        
        // Maps for aggregation
        Map<String, Long> timeAggMap = new HashMap<>();
        Map<String, List<Double>> accAggMap = new HashMap<>();

        // Fill Aggregation Maps
        for (UserLearningActivity a : activities) {
            LocalDate d = a.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate(); 
            String key = groupByMonth 
                ? String.format("%d-%02d", d.getYear(), d.getMonthValue()) 
                : d.toString();
            
            // Populate dailyHeatmap independently for calendar view (always daily)
            String dailyKey = d.toString();
            long duration = a.getDurationInSeconds() != null ? a.getDurationInSeconds() : 0L;
            dailyHeatmap.merge(dailyKey, (int) Math.ceil(duration / 60.0), Integer::sum);
            
            // Populate chart data maps
            timeAggMap.merge(key, duration, Long::sum);
            
            if (a.getMaxScore() != null && a.getMaxScore() > 0) {
                double sessionAcc = ((double) a.getScore() / a.getMaxScore()) * 100.0;
                sessionAcc = Math.min(100.0, Math.max(0.0, sessionAcc));
                accAggMap.computeIfAbsent(key, k -> new ArrayList<>()).add(sessionAcc);
            }
        }

        // Generate Chart Data Loop
        LocalDate temp = startDate;
        DateTimeFormatter labelFormatter = groupByMonth ? DateTimeFormatter.ofPattern("MMM") : DateTimeFormatter.ofPattern("dd/MM");
        
        while (!temp.isAfter(endDate)) {
            String key = groupByMonth 
                ? String.format("%d-%02d", temp.getYear(), temp.getMonthValue()) 
                : temp.toString();
                
            String label = temp.format(labelFormatter);
            
            // Time logic
            long dbSeconds = timeAggMap.getOrDefault(key, 0L);
            long dbMinutes = (long) Math.ceil(dbSeconds / 60.0);
            
            // Merge with Redis only for Daily views (Redis keys are daily)
            long finalMinutes = dbMinutes;
            if (!groupByMonth) {
                String redisKey = ONLINE_TIME_KEY + userId + ":" + temp.toString();
                Object redisValObj = redisTemplate.opsForValue().get(redisKey);
                long redisMinutes = redisValObj != null ? Long.parseLong(redisValObj.toString()) : 0L;
                finalMinutes = Math.max(redisMinutes, dbMinutes);
                dailyHeatmap.put(key, (int)finalMinutes);
            }

            // Accuracy logic
            List<Double> accList = accAggMap.getOrDefault(key, Collections.emptyList());
            double accVal = accList.isEmpty() ? 0.0 : accList.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

            timeChart.add(new ChartDataPoint(label, (double)finalMinutes, key));
            accuracyChart.add(new ChartDataPoint(label, accVal, key));
            
            // Increment loop
            if (groupByMonth) {
                temp = temp.plusMonths(1);
            } else {
                temp = temp.plusDays(1);
            }
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

        boolean activeYesterday = userLearningActivityRepository.existsByUserIdAndCreatedAtBetween(userId, yesterdayStart, yesterdayEnd);
        boolean onlineYesterday = checkRedisActivity(userId, now.minusDays(1).toLocalDate());

        if (!activeYesterday && !onlineYesterday) {
            return;
        }

        ProficiencyLevel currentLevel = user.getProficiency() != null ? user.getProficiency() : ProficiencyLevel.A1;
        ProficiencyLevel nextLevel = getNextLevel(currentLevel);
        DifficultyLevel diffLevel = mapProficiencyToDifficulty(nextLevel);
        
        List<Course> candidateCourses = courseRepository.findByLatestPublicVersion_DifficultyLevelAndApprovalStatus(
            diffLevel, 
            com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus.APPROVED
        );

        String candidateCoursesText = candidateCourses.stream()
            .limit(5)
            .map(c -> "- " + c.getTitle() + " (" + c.getLatestPublicVersion().getDifficultyLevel() + ")")
            .collect(Collectors.joining("\n"));

        String prompt = String.format(
            "Analyze this user's learning data. Level %s.\n" +
            "1. Evaluate progress.\n" +
            "2. Suggest improvements.\n" +
            "3. Recommend courses:\n%s\n\n" +
            "OUTPUT JSON: { \"title\": \"...\", \"summary\": \"...\", \"action_items\": [...], \"course_recommendation\": \"...\", \"level_up_trigger\": false }",
            currentLevel, candidateCoursesText
        );

        try {
            grpcClientService.callChatWithAIAsync(null, userId.toString(), prompt, new ArrayList<>())
                .thenAccept(suggestion -> {
                    if (suggestion != null && !suggestion.isEmpty()) {
                        String cleanJson = suggestion.replaceAll("```json", "").replaceAll("```", "").trim();
                        if (cleanJson.contains("\"level_up_trigger\": true") || cleanJson.contains("\"level_up_trigger\":true")) {
                             updateUserLevel(user, nextLevel);
                        }
                        user.setLatestImprovementSuggestion(cleanJson);
                        user.setLastSuggestionGeneratedAt(OffsetDateTime.now());
                        userRepository.save(user);

                        NotificationRequest notifRequest = NotificationRequest.builder()
                                .userId(userId)
                                .title("Daily AI Coach \uD83E\uDD16")
                                .content("Your daily learning analysis is ready!")
                                .type("AI_SUGGESTION")
                                .build();
                        notificationService.createPushNotification(notifRequest);
                    }
                });
        } catch (Exception e) {
            log.error("Error calling AI: {}", e.getMessage());
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

    private void updateUserLevel(User user, ProficiencyLevel newLevel) {
        try {
            user.setProficiency(newLevel);
            NotificationRequest levelUpNotif = NotificationRequest.builder()
                    .userId(user.getUserId())
                    .title("Level Up! \uD83C\uDF89")
                    .content("Promoted to " + newLevel + "!")
                    .type("LEVEL_UP")
                    .build();
            notificationService.createPushNotification(levelUpNotif);
        } catch (Exception e) {
            log.warn("Level upgrade failed.");
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordHeartbeat(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        user.setLastActiveAt(OffsetDateTime.now());
        userRepository.save(user);
        String todayStr = LocalDate.now().toString();
        String key = ONLINE_TIME_KEY + userId + ":" + todayStr;
        redisTemplate.opsForValue().increment(key, 1);
        redisTemplate.expire(key, 30, TimeUnit.DAYS);
    }
}