package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.OverviewMetricsDto;
import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatisticsServiceImpl implements StatisticsService {
    
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final LessonProgressWrongItemRepository lessonProgressWrongItemRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final TransactionRepository transactionRepository;

    private static final String ONLINE_TIME_KEY = "user:online_minutes:";
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Override
    public StudyHistoryResponse getStudyHistory(UUID userId, LocalDate startDate, LocalDate endDate, String period) {
        if (startDate == null || endDate == null) {
            LocalDate now = LocalDate.now(VN_ZONE);
            endDate = now;
            String safePeriod = period != null ? period.toLowerCase() : "week";
            
            switch (safePeriod) {
                case "day" -> startDate = now;
                case "month" -> startDate = now.minusDays(29);
                case "year" -> startDate = now.minusMonths(11).withDayOfMonth(1);
                default -> startDate = now.minusDays(6);
            }
        }

        log.info("getStudyHistory - userId:{}, period:{}, range:{} to {}", userId, period, startDate, endDate);
        
        OffsetDateTime start = startDate.atStartOfDay(VN_ZONE).toOffsetDateTime();
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay(VN_ZONE).toOffsetDateTime();
        
        List<UserLearningActivity> currentActivities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);

        List<StudySessionResponse> sessions = currentActivities.stream()
                .map(this::mapToStudySession)
                .sorted(Comparator.comparing(StudySessionResponse::getDate).reversed())
                .collect(Collectors.toList());

        StatsResponse currentStats = calculateStatsFixed(userId, startDate, endDate, currentActivities, period);

        Map<String, Integer> dailyActivity = currentActivities.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate().toString(),
                        Collectors.summingInt(a -> 1)
                ));

        return StudyHistoryResponse.builder()
                .sessions(sessions)
                .stats(currentStats)
                .dailyActivity(dailyActivity)
                .build();
    }

    private StatsResponse calculateStatsFixed(UUID userId, LocalDate startDate, LocalDate endDate,
                                              List<UserLearningActivity> currentActivities, String period) {
        
        long totalSeconds = currentActivities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .mapToLong(UserLearningActivity::getDurationInSeconds)
                .sum();

        double averageAccuracy = currentActivities.stream()
                .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null)
                .mapToDouble(a -> Math.min(100.0, (a.getScore().doubleValue() / a.getMaxScore()) * 100))
                .average()
                .orElse(0.0);

        long totalCoins = currentActivities.stream()
                .filter(a -> a.getScore() != null)
                .mapToLong(a -> a.getScore().longValue())
                .sum();

        int lessonsCompleted = (int) currentActivities.stream()
                .filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETION)
                .count();
        
        LocalDate prevStartDate, prevEndDate;
        String safePeriod = period == null ? "week" : period.toLowerCase();
        
        switch (safePeriod) {
            case "day" -> { prevStartDate = startDate.minusDays(1); prevEndDate = startDate.minusDays(1); }
            case "month" -> { prevStartDate = startDate.minusDays(30); prevEndDate = endDate.minusDays(30); }
            case "year" -> { prevStartDate = startDate.minusYears(1); prevEndDate = endDate.minusYears(1); }
            default -> { prevStartDate = startDate.minusDays(7); prevEndDate = endDate.minusDays(7); }
        }
        
        OffsetDateTime prevStart = prevStartDate.atStartOfDay(VN_ZONE).toOffsetDateTime();
        OffsetDateTime prevEnd = prevEndDate.plusDays(1).atStartOfDay(VN_ZONE).toOffsetDateTime();
        
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
        
        double timeGrowth = calculateGrowthPercent(totalSeconds, prevTimeSeconds);
        double accuracyGrowth = calculateGrowthPercent((long) averageAccuracy, (long) prevAccuracy);
        double coinsGrowth = calculateGrowthPercent(totalCoins, prevCoins);
        
        String weakestSkill = findWeakestSkillFromWrongItems(userId, startDate, endDate);
        String aiSuggestion = generateImprovementSuggestion(weakestSkill, averageAccuracy);
        
        List<ChartDataPoint> timeChartData = buildChartData(startDate, endDate, currentActivities, period, "TIME");
        List<ChartDataPoint> accuracyChartData = buildChartData(startDate, endDate, currentActivities, period, "ACCURACY");

        return StatsResponse.builder()
                .totalSessions(currentActivities.size())
                .totalTimeSeconds(totalSeconds)
                .totalExperience((int) totalCoins)
                .totalCoins((int) totalCoins)
                .lessonsCompleted(lessonsCompleted)
                .averageAccuracy(averageAccuracy)
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

    private List<ChartDataPoint> buildChartData(LocalDate startDate, LocalDate endDate, 
                                                List<UserLearningActivity> activities, 
                                                String period, String type) {
        List<ChartDataPoint> chartData = new ArrayList<>();
        String safePeriod = period == null ? "week" : period.toLowerCase();

        Map<String, List<UserLearningActivity>> groupedActivities = new HashMap<>();
        DateTimeFormatter keyFormatter;

        if ("year".equals(safePeriod)) {
            keyFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        } else if ("month".equals(safePeriod)) {
             keyFormatter = DateTimeFormatter.ofPattern("yyyy-w");
        } else {
            keyFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        }

        for (UserLearningActivity a : activities) {
            LocalDate date = a.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate();
            String key;
            if ("month".equals(safePeriod)) {
                int weekNum = (date.getDayOfMonth() - 1) / 7 + 1; 
                key = date.getMonthValue() + "-W" + weekNum; // Ví dụ: 12-W1
            } else {
                key = date.format(keyFormatter);
            }
            groupedActivities.computeIfAbsent(key, k -> new ArrayList<>()).add(a);
        }

        if ("year".equals(safePeriod)) {
            LocalDate curr = startDate.withDayOfMonth(1);
            while (!curr.isAfter(endDate)) {
                String key = curr.format(keyFormatter);
                String label = "T" + curr.getMonthValue(); 
                addDataPoint(chartData, label, key, groupedActivities.get(key), type);
                curr = curr.plusMonths(1);
            }
        } else if ("month".equals(safePeriod)) {
            LocalDate curr = startDate;
            int weekCount = 1;
            while (!curr.isAfter(endDate)) {
                String key = curr.getMonthValue() + "-W" + weekCount;
                String label = "W" + weekCount;
                addDataPoint(chartData, label, key, groupedActivities.get(key), type);
                
                curr = curr.plusWeeks(1);
                weekCount++;
                if (weekCount > 5) break;
            }
        } else {
            LocalDate curr = startDate;
            while (!curr.isAfter(endDate)) {
                String key = curr.format(keyFormatter);
                String label = curr.format(DateTimeFormatter.ofPattern("EE", Locale.ENGLISH)); // Mon, Tue...
                addDataPoint(chartData, label, key, groupedActivities.get(key), type);
                curr = curr.plusDays(1);
            }
        }
        
        return chartData;
    }

    private void addDataPoint(List<ChartDataPoint> chartData, String label, String fullDate, 
                              List<UserLearningActivity> acts, String type) {
        double value = 0;
        if (acts != null && !acts.isEmpty()) {
            if ("TIME".equals(type)) {
                long totalSeconds = acts.stream()
                        .filter(a -> a.getDurationInSeconds() != null)
                        .mapToLong(UserLearningActivity::getDurationInSeconds)
                        .sum();
                value = Math.ceil(totalSeconds / 60.0); 
            } else {
                 value = acts.stream()
                        .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0)
                        .mapToDouble(a -> (a.getScore().doubleValue() / a.getMaxScore()) * 100)
                        .average().orElse(0.0);
            }
        }
        
        chartData.add(ChartDataPoint.builder()
                .label(label)
                .value(value)
                .fullDate(fullDate)
                .build());
    }

    private List<ChartDataPoint> buildTimeChartDataFixed(UUID userId, LocalDate startDate, LocalDate endDate, List<UserLearningActivity> activities, String period) {
        boolean groupByMonth = "year".equalsIgnoreCase(period);
        DateTimeFormatter labelFormatter = groupByMonth ? DateTimeFormatter.ofPattern("MMM") : DateTimeFormatter.ofPattern("dd/MM");
        
        Map<String, Long> dbTimeMap = activities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .collect(Collectors.groupingBy(
                        a -> {
                            LocalDate d = a.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate();
                            return groupByMonth ? String.format("%d-%02d", d.getYear(), d.getMonthValue()) : d.toString();
                        },
                        Collectors.summingLong(UserLearningActivity::getDurationInSeconds)
                ));
        
        List<ChartDataPoint> chart = new ArrayList<>();
        int safetyLimit = 0;

        if (groupByMonth) {
            LocalDate curMonth = startDate.withDayOfMonth(1);
            LocalDate endMonth = endDate.withDayOfMonth(1);
            while (!curMonth.isAfter(endMonth) && safetyLimit < 24) {
                String key = String.format("%d-%02d", curMonth.getYear(), curMonth.getMonthValue());
                long dbSeconds = dbTimeMap.getOrDefault(key, 0L);
                long dbMinutes = (long) Math.ceil(dbSeconds / 60.0);
                
                chart.add(ChartDataPoint.builder()
                        .label(curMonth.format(labelFormatter))
                        .value((double) dbMinutes)
                        .fullDate(key)
                        .build());
                curMonth = curMonth.plusMonths(1);
                safetyLimit++;
            }
        } else {
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate) && safetyLimit < 60) {
                String key = cur.toString();
                String redisKey = ONLINE_TIME_KEY + userId + ":" + key;
                long redisMinutes = 0L;
                
                Object redisVal = redisTemplate.opsForValue().get(redisKey);
                if(redisVal != null) {
                    try {
                             redisMinutes = Long.parseLong(redisVal.toString());
                    } catch (Exception e) {}
                }
                
                long dbSeconds = dbTimeMap.getOrDefault(key, 0L);
                long dbMinutes = (long) Math.ceil(dbSeconds / 60.0);
                long finalMinutes = Math.max(dbMinutes, redisMinutes);
                
                chart.add(ChartDataPoint.builder()
                        .label(cur.format(labelFormatter))
                        .value((double) finalMinutes)
                        .fullDate(key)
                        .build());
                cur = cur.plusDays(1);
                safetyLimit++;
            }
        }
        
        return chart;
    }

    private List<ChartDataPoint> buildAccuracyChartDataFixed(LocalDate startDate, LocalDate endDate, List<UserLearningActivity> activities, String period) {
        boolean groupByMonth = "year".equalsIgnoreCase(period);
        DateTimeFormatter labelFormatter = groupByMonth ? DateTimeFormatter.ofPattern("MMM") : DateTimeFormatter.ofPattern("dd/MM");

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
        int safetyLimit = 0;
        
        if (groupByMonth) {
            LocalDate curMonth = startDate.withDayOfMonth(1);
            LocalDate endMonth = endDate.withDayOfMonth(1);
            
            while (!curMonth.isAfter(endMonth) && safetyLimit < 24) {
                String key = String.format("%d-%02d", curMonth.getYear(), curMonth.getMonthValue());
                List<Double> accList = accuracyMap.getOrDefault(key, Collections.emptyList());
                double avgAccuracy = accList.isEmpty() 
                    ? 0.0 
                    : accList.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                
                chart.add(ChartDataPoint.builder()
                        .label(curMonth.format(labelFormatter))
                        .value(avgAccuracy)
                        .fullDate(key)
                        .build());
                curMonth = curMonth.plusMonths(1);
                safetyLimit++;
            }
        } else {
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate) && safetyLimit < 60) {
                String key = cur.toString();
                List<Double> accList = accuracyMap.getOrDefault(key, Collections.emptyList());
                double avgAccuracy = accList.isEmpty() 
                    ? 0.0 
                    : accList.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                
                chart.add(ChartDataPoint.builder()
                        .label(cur.format(labelFormatter))
                        .value(avgAccuracy)
                        .fullDate(key)
                        .build());
                cur = cur.plusDays(1);
                safetyLimit++;
            }
        }
        return chart;
    }

    private String findWeakestSkillFromWrongItems(UUID userId, LocalDate startDate, LocalDate endDate) {
        OffsetDateTime start = startDate.atStartOfDay(VN_ZONE).toOffsetDateTime();
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay(VN_ZONE).toOffsetDateTime();
        List<Object[]> results = lessonProgressWrongItemRepository.findMostFrequentWrongSkills(userId, start, end);
        if (results != null && !results.isEmpty()) {
            Object[] mostFrequent = results.get(0);
            if (mostFrequent.length > 0 && mostFrequent[0] != null) return mostFrequent[0].toString();
        }
        return "NONE";
    }

    private double calculateGrowthPercent(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return ((double) (current - previous) / previous) * 100.0;
    }

    private String generateImprovementSuggestion(String weakestSkill, double averageAccuracy) {
        if (averageAccuracy == 0) return "Start your first lesson!";
        return averageAccuracy >= 75 ? "Great job! Keep it up!" : "Focus more on " + weakestSkill;
    }
    
    private StudySessionResponse mapToStudySession(UserLearningActivity activity) {
        return StudySessionResponse.builder()
                .id(activity.getActivityId())
                .type(activity.getActivityType().name())
                .date(activity.getCreatedAt())
                .duration(activity.getDurationInSeconds() != null ? activity.getDurationInSeconds() : 0L)
                .score(activity.getScore())
                .maxScore(activity.getMaxScore())
                .experience(activity.getScore() != null ? activity.getScore().intValue() : 0)
                .skills(List.of(activity.getActivityType().name()))
                .completed(true)
                .build();
    }

    @Override
    public StatisticsOverviewResponse getOverview(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate) {
        if (startDate == null) startDate = LocalDate.now().minusWeeks(1);
        if (endDate == null) endDate = LocalDate.now();

        OffsetDateTime start = startDate.atStartOfDay(VN_ZONE).toOffsetDateTime();
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay(VN_ZONE).toOffsetDateTime();

        long totalUsers = userRepository.countByCreatedAtBetween(start, end);
        long totalCourses = courseRepository.countByCreatedAtBetweenAndIsDeletedFalse(start, end);
        long totalLessons = lessonRepository.count(); 
        
        long totalTransactions = transactionRepository.findByCreatedAtBetween(start, end).size();
        
        BigDecimal totalRevenue = transactionRepository.sumAmountByStatusAndCreatedAtBetween(
            TransactionStatus.SUCCESS, start, end
        );
        
        if (totalRevenue == null) totalRevenue = BigDecimal.ZERO;

        return StatisticsOverviewResponse.builder()
                .totalUsers((int) totalUsers)
                .totalCourses((int) totalCourses)
                .totalLessons((int) totalLessons)
                .totalRevenue(totalRevenue)
                .totalTransactions((int) totalTransactions)
                .build();
    }

    @Override
    public StatisticsResponse getUserStatistics(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate) {
          StudyHistoryResponse history = getStudyHistory(userId, startDate, endDate, aggregate);
          
          return StatisticsResponse.builder()
                  .totalExperience((int) history.getStats().getTotalExperience()) 
                  .averageAccuracy(history.getStats().getAverageAccuracy())
                  .build();
    }

    @Override
    public List<UserCountResponse> getUserCounts(String period, LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusWeeks(1);
        if (endDate == null) endDate = LocalDate.now();
        
        OffsetDateTime start = startDate.atStartOfDay(VN_ZONE).toOffsetDateTime();
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay(VN_ZONE).toOffsetDateTime();
        
        long count = userRepository.countByCreatedAtBetween(start, end);
        long total = userRepository.count();
        
        return List.of(UserCountResponse.builder()
                .period(startDate.toString())
                .newUsers(count)
                .totalUsers(total)
                .build());
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
        if (startDate == null) startDate = LocalDate.now().minusWeeks(1);
        if (endDate == null) endDate = LocalDate.now();

        OffsetDateTime start = startDate.atStartOfDay(VN_ZONE).toOffsetDateTime();
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay(VN_ZONE).toOffsetDateTime();
        
        List<Transaction> transactions = transactionRepository.findByCreatedAtBetween(start, end);
        
        Map<String, Long> grouping = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getStatus().name(),
                        Collectors.counting()
                ));
        
        return grouping.entrySet().stream()
                .map(e -> TransactionStatsResponse.builder()
                        .status(e.getKey())
                        .count(e.getValue())
                        .period(period)
                        .totalAmount(BigDecimal.ZERO) 
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public TeacherOverviewResponse getTeacherOverview(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return TeacherOverviewResponse.builder().build();
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
        StudyHistoryResponse history = getStudyHistory(userId, startDate, endDate, "week");
        
        OverviewMetricsDto overview = OverviewMetricsDto.builder()
                .totalXP((int) history.getStats().getTotalExperience())
                .totalLearningTime(history.getStats().getTotalTimeSeconds())
                .build();
        
        List<TimeSeriesPoint> chart = history.getStats().getTimeChartData().stream()
                .map(p -> TimeSeriesPoint.builder()
                        .date(p.getFullDate())
                        .value(BigDecimal.valueOf(p.getValue()))
                        .label(p.getLabel())
                        .build())
                .collect(Collectors.toList());

        return DashboardStatisticsResponse.builder()
                .overview(overview)
                .learningTimeChart(chart)
                .courseProgress(Collections.emptyList())
                .recentActivities(Collections.emptyList())
                .build();
    }

    @Override
    public DepositRevenueResponse getDepositRevenueStatistics(LocalDate startDate, LocalDate endDate, String aggregate) {
        if (startDate == null) startDate = LocalDate.now().minusWeeks(1);
        if (endDate == null) endDate = LocalDate.now();
        
        OffsetDateTime start = startDate.atStartOfDay(VN_ZONE).toOffsetDateTime();
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay(VN_ZONE).toOffsetDateTime();

        // Fix: Query by Status only, then filter Types in memory to match Dashboard logic
        List<Transaction> revenueTransactions = transactionRepository.findByStatusAndCreatedAtBetween(
                TransactionStatus.SUCCESS, start, end);
        
        // Filter: Include both DEPOSIT (Wallet Load) and PAYMENT (Course Purchase)
        List<Transaction> validTransactions = revenueTransactions.stream()
                .filter(t -> t.getType() == TransactionType.DEPOSIT || t.getType() == TransactionType.PAYMENT)
                .collect(Collectors.toList());
        
        BigDecimal totalRevenue = validTransactions.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Build Time Series for Chart
        boolean groupByMonth = "year".equalsIgnoreCase(aggregate);
        DateTimeFormatter labelFormatter = groupByMonth ? DateTimeFormatter.ofPattern("MMM") : DateTimeFormatter.ofPattern("dd/MM");
        
        Map<String, BigDecimal> revenueMap = validTransactions.stream()
                .collect(Collectors.groupingBy(
                        t -> {
                            LocalDate d = t.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate();
                            return groupByMonth ? String.format("%d-%02d", d.getYear(), d.getMonthValue()) : d.toString();
                        },
                        Collectors.mapping(
                            Transaction::getAmount,
                            Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)
                        )
                ));
        
        List<TimeSeriesPoint> timeSeries = new ArrayList<>();
        int safetyLimit = 0;
        
        if (groupByMonth) {
            LocalDate curMonth = startDate.withDayOfMonth(1);
            LocalDate endMonth = endDate.withDayOfMonth(1);
            while (!curMonth.isAfter(endMonth) && safetyLimit < 24) {
                String key = String.format("%d-%02d", curMonth.getYear(), curMonth.getMonthValue());
                BigDecimal val = revenueMap.getOrDefault(key, BigDecimal.ZERO);
                
                timeSeries.add(TimeSeriesPoint.builder()
                        .label(curMonth.format(labelFormatter))
                        .value(val)
                        .date(key)
                        .build());
                curMonth = curMonth.plusMonths(1);
                safetyLimit++;
            }
        } else {
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate) && safetyLimit < 60) {
                String key = cur.toString();
                BigDecimal val = revenueMap.getOrDefault(key, BigDecimal.ZERO);
                
                timeSeries.add(TimeSeriesPoint.builder()
                        .label(cur.format(labelFormatter))
                        .value(val)
                        .date(key)
                        .build());
                cur = cur.plusDays(1);
                safetyLimit++;
            }
        }

        return DepositRevenueResponse.builder()
                .totalRevenue(totalRevenue)
                .timeSeries(timeSeries)
                .build();
    }
}