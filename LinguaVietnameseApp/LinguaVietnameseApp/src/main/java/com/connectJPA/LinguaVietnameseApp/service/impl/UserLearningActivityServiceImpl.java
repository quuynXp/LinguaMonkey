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
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
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
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLearningActivityServiceImpl implements UserLearningActivityService {

    private final UserLearningActivityRepository userLearningActivityRepository;
    private final LessonProgressRepository lessonProgressRepository; // Cần repo này để query bảng lesson_progress
    private final UserDailyChallengeRepository userDailyChallengeRepository; // Cần repo này để query bảng user_daily_challenges
    private final CourseVersionEnrollmentRepository enrollmentRepository; // Cần repo này để query bảng enrollments
    
    private final UserLearningActivityMapper userLearningActivityMapper;
    private final LessonRepository lessonRepository;
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
        
        // Invalidate cache
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
        // Handle logic if needed
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

    public void recordHeartbeat(UUID userId) {
        String todayStr = LocalDate.now().toString();
        String key = ONLINE_TIME_KEY + userId + ":" + todayStr;
        redisTemplate.opsForValue().increment(key, 1);
        // Lưu cache 30 ngày để biểu đồ không bị mất dữ liệu quá khứ
        redisTemplate.expire(key, 30, TimeUnit.DAYS);
    }

    /**
     * QUERY TOÀN BỘ ỨNG DỤNG:
     * Thay vì chỉ dựa vào UserLearningActivity, hàm này quét qua tất cả các bảng:
     * 1. lesson_progress (Tiến độ bài học)
     * 2. user_daily_challenges (Thử thách)
     * 3. user_learning_activities (Log)
     * 4. Redis (Thời gian online)
     */
    @Override
    public StudyHistoryResponse getAggregatedStudyHistory(UUID userId, String period) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate;

        switch (period.toLowerCase()) {
            case "week" -> startDate = endDate.minusDays(6);
            case "year" -> startDate = endDate.minusMonths(11); // 12 tháng gần nhất
            case "month" -> startDate = endDate.minusDays(29);
            default -> startDate = endDate.minusDays(29); 
        }

        OffsetDateTime startOdt = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endOdt = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // 1. Lấy dữ liệu từ bảng LOG (Activities)
        List<UserLearningActivity> activities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, startOdt, endOdt);

        // 2. Lấy dữ liệu từ bảng LESSON PROGRESS (Tiến độ học tập thực tế)
        // Cần custom query trong LessonProgressRepository: findByUserIdAndUpdatedAtBetween
        List<LessonProgress> progresses = lessonProgressRepository
                .findByIdUserIdAndUpdatedAtBetween(userId, startOdt, endOdt);

        // 3. Lấy dữ liệu từ bảng DAILY CHALLENGES (Thử thách đã làm)
        // Cần custom query: findByUserIdAndCompletedAtBetween
        // Lưu ý: user_daily_challenges thường dùng LocalDateTime, cần convert cẩn thận
        List<UserDailyChallenge> challenges = userDailyChallengeRepository
                .findByUser_UserIdAndCompletedAtBetween(userId, startOdt, endOdt);

        // --- TỔNG HỢP DỮ LIỆU ---
        
        // Map: Date String (yyyy-MM-dd) -> Total Seconds
        Map<String, Long> durationMap = new HashMap<>();
        // Map: Date String -> Session Count
        Map<String, Long> sessionCountMap = new HashMap<>();
        // Map: Date String -> Exp
        Map<String, Integer> expMap = new HashMap<>();

        // Xử lý Activities Log
        for (UserLearningActivity a : activities) {
            String dateKey = a.getCreatedAt().toLocalDate().toString();
            long duration = a.getDurationInSeconds() != null ? a.getDurationInSeconds() : 0L;
            durationMap.merge(dateKey, duration, Long::sum);
            sessionCountMap.merge(dateKey, 1L, Long::sum);
        }

        // Xử lý Lesson Progress (Nếu log bị thiếu, dùng cái này bù vào)
        // Giả định mỗi bài học hoàn thành ~ 10 phút (600s) nếu không có log thời gian chính xác
        for (LessonProgress p : progresses) {
            String dateKey = p.getUpdatedAt().toLocalDate().toString();
            // Chỉ cộng nếu chưa có log tương ứng (đơn giản hóa bằng cách cộng thêm ước lượng)
            // Hoặc coi mỗi progress là một session chắc chắn
            sessionCountMap.merge(dateKey, 1L, Long::sum);
            durationMap.merge(dateKey, 600L, Long::sum); // Ước tính 10 phút/bài
            expMap.merge(dateKey, 10, Integer::sum); // Ước tính 10 EXP/bài
        }

        // Xử lý Daily Challenges
        for (UserDailyChallenge c : challenges) {
            if (c.getCompletedAt() != null) {
                String dateKey = c.getCompletedAt().toLocalDate().toString();
                sessionCountMap.merge(dateKey, 1L, Long::sum);
                durationMap.merge(dateKey, 300L, Long::sum); // Ước tính 5 phút/thử thách
                expMap.merge(dateKey, c.getExpReward() > 0 ? c.getExpReward() : 50, Integer::sum);
            }
        }

        // --- KẾT HỢP VỚI REDIS (Heartbeat - Online Time) ---
        List<StudySessionResponse> dailySessions = new ArrayList<>();
        long totalSessions = 0;
        long totalLearningTimeSeconds = 0;
        long totalExp = 0;

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            String dateStr = current.toString();
            
            long dbSeconds = durationMap.getOrDefault(dateStr, 0L);
            long dbCount = sessionCountMap.getOrDefault(dateStr, 0L);
            int dbExp = expMap.getOrDefault(dateStr, 0);

            // Lấy từ Redis
            String redisKey = ONLINE_TIME_KEY + userId + ":" + dateStr;
            Integer redisMinutes = (Integer) redisTemplate.opsForValue().get(redisKey);
            long redisSeconds = (redisMinutes != null) ? (redisMinutes * 60L) : 0L;

            // Logic Merge: Lấy cái lớn nhất giữa (DB tính toán) và (Redis Heartbeat)
            // Điều này đảm bảo nếu user online mà không học bài nào, vẫn có data hiển thị (Redis)
            // Nếu user học nhiều bài (DB) mà Redis lỗi, vẫn có data hiển thị (DB)
            long finalDailySeconds = Math.max(dbSeconds, redisSeconds); 
            
            if (finalDailySeconds > 0 || dbCount > 0) {
                dailySessions.add(StudySessionResponse.builder()
                        .date(current.atStartOfDay().atOffset(ZoneOffset.UTC))
                        .duration(finalDailySeconds)
                        .experience(dbExp + (int)(finalDailySeconds / 60)) // Cộng thêm exp dựa trên thời gian
                        .title("Daily Activity")
                        .type("DAILY_SUMMARY")
                        .build());
                
                totalLearningTimeSeconds += finalDailySeconds;
            }
            
            totalSessions += dbCount;
            totalExp += dbExp;
            
            current = current.plusDays(1);
        }

        StatsResponse stats = StatsResponse.builder()
                .totalSessions((int) totalSessions)
                .totalTime(totalLearningTimeSeconds) 
                .totalExperience((int) totalExp) 
                .averageScore(0.0) // Có thể tính trung bình từ lesson_progress nếu cần
                .build();

        return StudyHistoryResponse.builder()
                .sessions(dailySessions)
                .stats(stats)
                .build();
    }
}