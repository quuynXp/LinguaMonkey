package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.CourseProgressDto;
import com.connectJPA.LinguaVietnameseApp.dto.OverviewMetricsDto;
import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import com.connectJPA.LinguaVietnameseApp.dto.TransactionSummaryDto;
import com.connectJPA.LinguaVietnameseApp.dto.BadgeProgressDto;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionType;
import com.connectJPA.LinguaVietnameseApp.mapper.UserLearningActivityMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import com.connectJPA.LinguaVietnameseApp.service.LessonProgressService;
import com.connectJPA.LinguaVietnameseApp.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatisticsServiceImpl implements StatisticsService {
    
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final LessonProgressWrongItemRepository lessonProgressWrongItemRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private static final String ONLINE_TIME_KEY = "user:online_minutes:";
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // ===================================================================
    // FIX #1: Study History với logic reset đúng cho mỗi period
    // ===================================================================
    @Override
    public StudyHistoryResponse getStudyHistory(UUID userId, LocalDate startDate, LocalDate endDate, String period) {
        log.info("📊 getStudyHistory - userId:{}, period:{}, range:{} to {}", userId, period, startDate, endDate);
        
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        
        // Lấy activities trong khoảng thời gian
        List<UserLearningActivity> currentActivities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);
        
        // Map sessions
        List<StudySessionResponse> sessions = currentActivities.stream()
                .map(this::mapToStudySession)
                .sorted(Comparator.comparing(StudySessionResponse::getDate).reversed())
                .collect(Collectors.toList());
        
        // Calculate stats với logic FIXED
        StatsResponse currentStats = calculateStatsFixed(userId, startDate, endDate, currentActivities, period);
        
        // Daily activity heatmap
        Map<String, Integer> dailyActivity = currentActivities.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate().toString(),
                        Collectors.summingInt(a -> 1)
                ));
        
        log.info("✅ Study history calculated - sessions:{}, totalTime:{}s", sessions.size(), currentStats.getTotalTimeSeconds());
        
        return StudyHistoryResponse.builder()
                .sessions(sessions)
                .stats(currentStats)
                .dailyActivity(dailyActivity)
                .build();
    }

    // ===================================================================
    // IMPLEMENTATION OF MISSING INTERFACE METHODS (STUBS)
    // ===================================================================

    @Override
    public StatisticsOverviewResponse getOverview(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return null;
    }

    @Override
    public StatisticsResponse getUserStatistics(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return null;
    }

    @Override
    public List<UserCountResponse> getUserCounts(String period, LocalDate startDate, LocalDate endDate) {
        return Collections.emptyList();
    }

    @Override
    public List<UserCountResponse> getUserGrowth(String period, LocalDate startDate, LocalDate endDate) {
        return Collections.emptyList();
    }

    @Override
    public List<ActivityCountResponse> getActivityStatistics(String activityType, LocalDate startDate, LocalDate endDate, String period) {
        return Collections.emptyList();
    }

    @Override
    public List<TransactionStatsResponse> getTransactionStatistics(String status, String provider, LocalDate startDate, LocalDate endDate, String period) {
        return Collections.emptyList();
    }

    @Override
    public TeacherOverviewResponse getTeacherOverview(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return null;
    }

    @Override
    public List<CoursePerformanceResponse> getTeacherCoursesPerformance(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return Collections.emptyList();
    }

    @Override
    public List<LessonStatsResponse> getTeacherCourseLessonStats(UUID teacherId, UUID courseId, LocalDate startDate, LocalDate endDate) {
        return Collections.emptyList();
    }

    @Override
    public List<TimeSeriesPoint> getTeacherCourseRevenue(UUID teacherId, UUID courseId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return Collections.emptyList();
    }

    @Override
    public DashboardStatisticsResponse getDashboardStatistics(UUID userId, LocalDate startDate, LocalDate endDate) {
        return null;
    }

    @Override
    public DepositRevenueResponse getDepositRevenueStatistics(LocalDate startDate, LocalDate endDate, String aggregate) {
        return null;
    }

    // ===================================================================
    // FIX #2: Tính stats với accuracy ĐÚNG và merge Redis data
    // ===================================================================
    private StatsResponse calculateStatsFixed(UUID userId, 
                                                               LocalDate startDate, 
                                                               LocalDate endDate,
                                                               List<UserLearningActivity> currentActivities,
                                                               String period) {
        
        // 1. Tính total time từ DB activities
        long dbTotalSeconds = currentActivities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .mapToLong(UserLearningActivity::getDurationInSeconds)
                .sum();
        
        // 2. ✅ FIX: Merge với Redis online time (lặp qua TỪNG NGÀY)
        long redisTotalMinutes = 0L;
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            String redisKey = ONLINE_TIME_KEY + userId + ":" + cur.toString();
            Object redisVal = redisTemplate.opsForValue().get(redisKey);
            if (redisVal != null) {
                redisTotalMinutes += Long.parseLong(redisVal.toString());
            }
            cur = cur.plusDays(1);
        }
        
        long dbTotalMinutes = (long) Math.ceil(dbTotalSeconds / 60.0);
        long finalTotalSeconds = Math.max(dbTotalMinutes * 60, redisTotalMinutes * 60);
        
        log.debug("Time merge: DB={}min, Redis={}min, Final={}s", dbTotalMinutes, redisTotalMinutes, finalTotalSeconds);
        
        // 3. ✅ FIX: Tính accuracy ĐÚNG (average của từng session, không phải sum)
        double averageAccuracy = currentActivities.stream()
                .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null)
                .mapToDouble(a -> {
                    // Mỗi activity tính accuracy riêng rồi lấy trung bình
                    double sessionAccuracy = (a.getScore().doubleValue() / a.getMaxScore()) * 100;
                    return Math.min(100.0, Math.max(0.0, sessionAccuracy)); // Clamp [0, 100]
                })
                .average()
                .orElse(0.0);
        
        // 4. Tính coins/exp
        long totalCoins = currentActivities.stream()
                .filter(a -> a.getScore() != null)
                .mapToLong(a -> a.getScore().longValue())
                .sum();
        
        int lessonsCompleted = (int) currentActivities.stream()
                .filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETION)
                .count();
        
        // 5. Tính growth so với kỳ trước
        LocalDate prevStartDate, prevEndDate;
        switch (period.toLowerCase()) {
            case "day" -> { prevStartDate = startDate.minusDays(1); prevEndDate = startDate.minusDays(1); }
            case "month" -> { prevStartDate = startDate.minusMonths(1); prevEndDate = endDate.minusMonths(1); }
            case "year" -> { prevStartDate = startDate.minusYears(1); prevEndDate = endDate.minusYears(1); }
            default -> { prevStartDate = startDate.minusWeeks(1); prevEndDate = endDate.minusWeeks(1); }
        }
        
        OffsetDateTime prevStart = prevStartDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime prevEnd = prevEndDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        
        List<UserLearningActivity> prevActivities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, prevStart, prevEnd);
        
        long prevTimeSeconds = prevActivities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .mapToLong(UserLearningActivity::getDurationInSeconds)
                .sum();
        
        double prevAccuracy = prevActivities.stream()
                .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null)
                .mapToDouble(a -> Math.min(100.0, (a.getScore().doubleValue() / a.getMaxScore()) * 100))
                .average()
                .orElse(0.0);
        
        long prevCoins = prevActivities.stream()
                .filter(a -> a.getScore() != null)
                .mapToLong(a -> a.getScore().longValue())
                .sum();
        
        double timeGrowth = calculateGrowthPercent(finalTotalSeconds, prevTimeSeconds);
        double accuracyGrowth = calculateGrowthPercent((long) averageAccuracy, (long) prevAccuracy);
        double coinsGrowth = calculateGrowthPercent(totalCoins, prevCoins);
        
        // 6. ✅ FIX: Weakest skill từ WRONG_ITEMS (không phải ActivityType)
        String weakestSkill = findWeakestSkillFromWrongItems(userId, startDate, endDate);
        
        String aiSuggestion = generateImprovementSuggestion(weakestSkill, averageAccuracy);
        
        // 7. ✅ FIX: Charts với Redis merge
        List<ChartDataPoint> timeChartData = buildTimeChartDataFixed(userId, startDate, endDate, currentActivities, period);
        List<ChartDataPoint> accuracyChartData = buildAccuracyChartDataFixed(startDate, endDate, currentActivities, period);
        
        log.info("Stats calculated: time={}s, accuracy={:.1f}%, coins={}, weakest={}", 
                finalTotalSeconds, averageAccuracy, totalCoins, weakestSkill);
        
        return StatsResponse.builder()
                .totalSessions(currentActivities.size())
                .totalTimeSeconds(finalTotalSeconds) // ✅ Đã merge Redis
                .totalExperience((int) totalCoins)
                .totalCoins((int) totalCoins)
                .lessonsCompleted(lessonsCompleted)
                .averageAccuracy(averageAccuracy) // ✅ Đã fix công thức
                .averageScore(averageAccuracy)
                .timeGrowthPercent(timeGrowth)
                .accuracyGrowthPercent(accuracyGrowth)
                .coinsGrowthPercent(coinsGrowth)
                .weakestSkill(weakestSkill)
                .improvementSuggestion(aiSuggestion)
                .timeChartData(timeChartData)
                .accuracyChartData(accuracyChartData)
                .build();
    }

    // ===================================================================
    // FIX #3: Build time chart với Redis merge CHO MỌI PERIOD
    // ===================================================================
    private List<ChartDataPoint> buildTimeChartDataFixed(UUID userId,
                                                                                                  LocalDate startDate, 
                                                                                                  LocalDate endDate, 
                                                                                                  List<UserLearningActivity> activities,
                                                                                                  String period) {
        
        boolean groupByMonth = "year".equalsIgnoreCase(period);
        
        // Map DB activities
        Map<String, Long> dbTimeMap = activities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .collect(Collectors.groupingBy(
                        a -> {
                            LocalDate d = a.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate();
                            return groupByMonth 
                                ? String.format("%d-%02d", d.getYear(), d.getMonthValue())
                                : d.toString();
                        },
                        Collectors.summingLong(UserLearningActivity::getDurationInSeconds)
                ));
        
        // ✅ FIX: Fetch Redis data cho TẤT CẢ các ngày trong range
        Map<String, Long> redisMinutesMap = new HashMap<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            String dailyKey = cur.toString();
            String redisKey = ONLINE_TIME_KEY + userId + ":" + dailyKey;
            Object redisVal = redisTemplate.opsForValue().get(redisKey);
            if (redisVal != null) {
                long minutes = Long.parseLong(redisVal.toString());
                
                String aggKey = groupByMonth 
                    ? String.format("%d-%02d", cur.getYear(), cur.getMonthValue())
                    : dailyKey;
                
                redisMinutesMap.merge(aggKey, minutes, Long::sum);
            }
            cur = cur.plusDays(1);
        }
        
        // Build chart
        List<ChartDataPoint> chart = new ArrayList<>();
        DateTimeFormatter labelFormatter = groupByMonth 
            ? DateTimeFormatter.ofPattern("MMM") 
            : DateTimeFormatter.ofPattern("dd/MM");
        
        cur = startDate;
        while (!cur.isAfter(endDate)) {
            String key = groupByMonth 
                ? String.format("%d-%02d", cur.getYear(), cur.getMonthValue())
                : cur.toString();
            
            String label = cur.format(labelFormatter);
            
            // Merge DB và Redis
            long dbSeconds = dbTimeMap.getOrDefault(key, 0L);
            long dbMinutes = (long) Math.ceil(dbSeconds / 60.0);
            long redisMinutes = redisMinutesMap.getOrDefault(key, 0L);
            
            long finalMinutes = Math.max(dbMinutes, redisMinutes);
            
            chart.add(ChartDataPoint.builder()
                    .label(label)
                    .value((double) finalMinutes)
                    .fullDate(key)
                    .build());
            
            // Increment
            cur = groupByMonth ? cur.plusMonths(1) : cur.plusDays(1);
            
            // Tránh infinite loop
            if (chart.size() > 366) break;
        }
        
        log.debug("Time chart: {} points, max={}", chart.size(), 
                chart.stream().mapToDouble(ChartDataPoint::getValue).max().orElse(0));
        
        return chart;
    }

    // ===================================================================
    // FIX #4: Accuracy chart với logic đúng
    // ===================================================================
    private List<ChartDataPoint> buildAccuracyChartDataFixed(LocalDate startDate, 
                                                                                                        LocalDate endDate, 
                                                                                                        List<UserLearningActivity> activities,
                                                                                                        String period) {
        
        boolean groupByMonth = "year".equalsIgnoreCase(period);

        // Map activities và tính accuracy ĐÚNG cho từng session
        Map<String, List<Double>> accuracyMap = activities.stream()
                .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null)
                .collect(Collectors.groupingBy(
                        a -> {
                            LocalDate d = a.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate();
                            return groupByMonth 
                                ? String.format("%d-%02d", d.getYear(), d.getMonthValue())
                                : d.toString();
                        },
                        Collectors.mapping(
                            a -> Math.min(100.0, (a.getScore().doubleValue() / a.getMaxScore()) * 100),
                            Collectors.toList()
                        )
                ));
        
        List<ChartDataPoint> chart = new ArrayList<>();
        DateTimeFormatter labelFormatter = groupByMonth 
            ? DateTimeFormatter.ofPattern("MMM") 
            : DateTimeFormatter.ofPattern("dd/MM");
        
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            String key = groupByMonth 
                ? String.format("%d-%02d", cur.getYear(), cur.getMonthValue())
                : cur.toString();
            
            String label = cur.format(labelFormatter);
            
            // Lấy trung bình accuracy của tất cả sessions trong bucket
            List<Double> accList = accuracyMap.getOrDefault(key, Collections.emptyList());
            double avgAccuracy = accList.isEmpty() 
                ? 0.0 
                : accList.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            
            chart.add(ChartDataPoint.builder()
                    .label(label)
                    .value(avgAccuracy)
                    .fullDate(key)
                    .build());
            
            cur = groupByMonth ? cur.plusMonths(1) : cur.plusDays(1);
            if (chart.size() > 366) break;
        }
        
        return chart;
    }

    // ===================================================================
    // FIX #5: Weakest skill từ WRONG_ITEMS table
    // ===================================================================
    private String findWeakestSkillFromWrongItems(UUID userId, LocalDate startDate, LocalDate endDate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        
        List<Object[]> results = lessonProgressWrongItemRepository
                .findMostFrequentWrongSkills(userId, start, end);
        
        if (results != null && !results.isEmpty()) {
            Object[] mostFrequent = results.get(0);
            if (mostFrequent.length > 0 && mostFrequent[0] != null) {
                return mostFrequent[0].toString();
            }
        }
        return "NONE";
    }

    // Helper methods
    private double calculateGrowthPercent(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return ((double) (current - previous) / previous) * 100.0;
    }

    private String generateImprovementSuggestion(String weakestSkill, double averageAccuracy) {
        if (averageAccuracy >= 90) {
            return "Excellent work! Keep maintaining this high performance level.";
        } else if (averageAccuracy >= 75) {
            return "Good progress! Focus on " + weakestSkill + " to reach mastery level.";
        } else {
            return "Consider spending more time on " + weakestSkill + " exercises to improve your accuracy.";
        }
    }
    
    private StudySessionResponse mapToStudySession(UserLearningActivity activity) {
        return StudySessionResponse.builder()
                .id(activity.getActivityId())
                .type(activity.getActivityType().name())
                .date(activity.getCreatedAt())
                .duration((long) activity.getDurationInSeconds())
                .score(activity.getScore())
                .maxScore(activity.getMaxScore())
                .experience(activity.getScore() != null ? activity.getScore().intValue() : 0)
                .skills(List.of(activity.getActivityType().name()))
                .completed(true)
                .build();
    }
}