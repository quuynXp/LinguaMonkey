package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.event.DailyChallengeCompletedEvent;
import com.connectJPA.LinguaVietnameseApp.event.LessonCompletedEvent;
import com.connectJPA.LinguaVietnameseApp.mapper.UserLearningActivityMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserLearningActivityRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLearningActivityServiceImpl implements UserLearningActivityService {
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final UserLearningActivityMapper userLearningActivityMapper;
    private final LessonRepository lessonRepository;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final DailyChallengeService dailyChallengeService;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String HISTORY_CACHE_KEY = "user:history:";
    private static final String ONLINE_TIME_KEY = "user:online_minutes:";

    @Override
    public Page<UserLearningActivityResponse> getAllUserLearningActivities(UUID userId, Pageable pageable) {
        Page<UserLearningActivity> activities = userLearningActivityRepository.findByUserIdAndIsDeletedFalse(userId, pageable);
        return activities.map(userLearningActivityMapper::toResponse);
    }

    @Override
    public UserLearningActivityResponse getUserLearningActivityById(UUID id) {
        UserLearningActivity activity = userLearningActivityRepository.findByActivityIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User learning activity not found"));
        return userLearningActivityMapper.toResponse(activity);
    }

    @Override
    @Transactional
    public ActivityCompletionResponse logActivityEndAndCheckChallenges(LearningActivityEventRequest request) {
        if (request.getDurationInSeconds() == null) {
             // Allow logging with 0 seconds if null to prevent crashes
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
        
        // Invalidate cache for this user since data changed
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":week");
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":month");
        redisTemplate.delete(HISTORY_CACHE_KEY + request.getUserId() + ":year");
        
        DailyChallengeUpdateResponse challengeUpdate = null;
        
        if (request.getActivityType() == ActivityType.LESSON_COMPLETED) {
            challengeUpdate = dailyChallengeService.updateChallengeProgress(
                    request.getUserId(), 
                    ChallengeType.LESSON_COMPLETED, 
                    1
            );
        }

        return ActivityCompletionResponse.builder()
                .activityLog(activityLog)
                .challengeUpdate(challengeUpdate)
                .build();
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleLessonCompleted(LessonCompletedEvent event) {
        log.info("Legacy listener event triggered for user: {}", event.getLessonProgress().getId().getUserId());
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleDailyChallengeCompleted(DailyChallengeCompletedEvent event) {
        // Logic for handling completion event
    }

    @Override
    @Transactional
    public UserLearningActivityResponse logUserActivity(UUID userId, ActivityType activityType, UUID relatedEntityId, Integer durationInSeconds, int expReward, String details, SkillType skillTypes) {
        if (userId == null || activityType == null) {
            throw new IllegalArgumentException("UserId and ActivityType are required for logging activity");
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
        return userLearningActivityMapper.toResponse(activity);
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
        return userLearningActivityMapper.toResponse(activity);
    }

    @Override
    @Transactional
    public void deleteUserLearningActivity(UUID id) {
        UserLearningActivity activity = userLearningActivityRepository.findByActivityIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User learning activity not found"));
        userLearningActivityRepository.softDeleteById(id);
    }

    /**
     * Records a heartbeat for online time calculation.
     * Increments a Redis counter for the current day.
     * Logic: 1 heartbeat = 1 minute.
     */
    public void recordHeartbeat(UUID userId) {
        String todayStr = LocalDate.now().toString();
        String key = ONLINE_TIME_KEY + userId + ":" + todayStr;
        
        // Increment by 1 (representing 1 minute)
        redisTemplate.opsForValue().increment(key, 1);
        
        // KEY FIX: Set expiry to 30 days instead of 24h so weekly/monthly charts have data
        redisTemplate.expire(key, 30, TimeUnit.DAYS);
    }

    /**
     * Smart Query Implementation:
     * 1. Iterates every day in the requested period.
     * 2. Sums SQL duration (Lesson completions).
     * 3. Sums Redis duration (Heartbeat/Online time).
     * 4. Returns consolidated list for charts.
     */
    @Override
    public StudyHistoryResponse getAggregatedStudyHistory(UUID userId, String period) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate;

        switch (period.toLowerCase()) {
            case "week" -> startDate = endDate.minusDays(6); // 7 days total including today
            case "year" -> startDate = endDate.minusMonths(11); // 12 months roughly, or last 365 days
            case "month" -> startDate = endDate.minusDays(29); // 30 days total
            default -> startDate = endDate.minusDays(29); 
        }

        // 1. Fetch SQL Data (Activities like Lesson/Quiz completions)
        List<UserLearningActivity> rawActivities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(
                    userId, 
                    startDate.atStartOfDay().atOffset(ZoneOffset.UTC), 
                    endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC)
                );

        // Map SQL data by Date String (yyyy-MM-dd)
        Map<String, Long> sqlDurationMap = rawActivities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate().toString(),
                        Collectors.summingLong(UserLearningActivity::getDurationInSeconds)
                ));

        // Map SQL count (Sessions)
        Map<String, Long> sqlSessionCountMap = rawActivities.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate().toString(),
                        Collectors.counting()
                ));

        List<StudySessionResponse> dailySessions = new ArrayList<>();
        long totalSessions = 0;
        long totalLearningTimeSeconds = 0;
        long totalExp = 0; // Calculate from completed lessons/challenges if needed

        // 2. Iterate through EVERY DAY in the range to merge SQL + Redis
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            String dateStr = current.toString();
            
            // Get SQL Data
            long sqlSeconds = sqlDurationMap.getOrDefault(dateStr, 0L);
            long sessionsCount = sqlSessionCountMap.getOrDefault(dateStr, 0L);

            // Get Redis Data (Online Time Heartbeats) -> Key: user:online_minutes:{userId}:{yyyy-MM-dd}
            String redisKey = ONLINE_TIME_KEY + userId + ":" + dateStr;
            Integer redisMinutes = (Integer) redisTemplate.opsForValue().get(redisKey);
            long redisSeconds = (redisMinutes != null) ? (redisMinutes * 60L) : 0L;

            // Merge Logic: Use max or sum? 
            // Usually, Heartbeat tracks "Time in App", Activity tracks "Time in Lesson".
            // Heartbeat is usually >= Lesson Time. 
            // To be safe and show activity on the Heatmap/Chart, we use the greater of the two or sum specific types.
            // Here, let's assume Redis captures ALL time, but if Redis is missing (expired), fall back to SQL.
            long dailyTotalSeconds = Math.max(sqlSeconds, redisSeconds); 
            
            // If explicit SQL duration is higher (e.g. heartbeat failed), add the diff.
            // Simplified: Just use the larger value to avoid double counting if heartbeat runs during lesson.

            if (dailyTotalSeconds > 0) {
                dailySessions.add(StudySessionResponse.builder()
                        .date(current.atStartOfDay().atOffset(ZoneOffset.UTC))
                        .duration(dailyTotalSeconds)
                        .experience((int) (dailyTotalSeconds / 60)) // Rough estimate: 1 XP per minute if generic
                        .title("Daily Activity") // Generic title for chart
                        .type("DAILY_SUMMARY")
                        .build());
                
                totalLearningTimeSeconds += dailyTotalSeconds;
            }
            
            totalSessions += sessionsCount;
            
            current = current.plusDays(1);
        }

        StatsResponse stats = StatsResponse.builder()
                .totalSessions((int) totalSessions)
                .totalTime(totalLearningTimeSeconds) 
                .totalExperience((int) totalExp) 
                .averageScore(0.0)
                .build();

        return StudyHistoryResponse.builder()
                .sessions(dailySessions)
                .stats(stats)
                .build();
    }
}