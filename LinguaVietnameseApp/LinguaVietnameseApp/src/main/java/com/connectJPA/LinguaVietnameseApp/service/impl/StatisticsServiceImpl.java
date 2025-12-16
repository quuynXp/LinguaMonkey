package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.CourseProgressDto;
import com.connectJPA.LinguaVietnameseApp.dto.OverviewMetricsDto;
import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import com.connectJPA.LinguaVietnameseApp.dto.TransactionSummaryDto;
import com.connectJPA.LinguaVietnameseApp.dto.BadgeProgressDto;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionType;
import com.connectJPA.LinguaVietnameseApp.mapper.UserLearningActivityMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import com.connectJPA.LinguaVietnameseApp.service.LessonProgressService;
import com.connectJPA.LinguaVietnameseApp.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatisticsServiceImpl implements StatisticsService {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final CourseVersionEnrollmentRepository courseVersionEnrollmentRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final VideoCallParticipantRepository videoCallParticipantRepository;
    private final UserEventRepository userEventRepository;
    private final CourseRepository courseRepository;
    private final BadgeService badgeService;
    private final LessonProgressService lessonProgressService;
    private final UserLearningActivityMapper userLearningActivityMapper;
    private final BadgeRepository badgeRepository;

    // Helper tính streak
    private int calculateStreak(UUID userId) {
        int streak = 0;
        LocalDate checkDate = LocalDate.now();
        // Check today
        if (hasActivityOnDate(userId, checkDate)) {
            streak++;
        }
        // Check backwards
        checkDate = checkDate.minusDays(1);
        while (hasActivityOnDate(userId, checkDate)) {
            streak++;
            checkDate = checkDate.minusDays(1);
        }
        return streak;
    }

    private boolean hasActivityOnDate(UUID userId, LocalDate date) {
        OffsetDateTime start = date.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = date.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        return userLearningActivityRepository.existsByUserIdAndDateRange(userId, start, end);
    }

    private static class BucketAggregate {
        BigDecimal revenue;
        long count;
        BucketAggregate(BigDecimal r, long c) { revenue = r; count = c; }
    }
    private static class BucketRange {
        LocalDate start, end;
        BucketRange(LocalDate s, LocalDate e) { start = s; end = e; }
    }

    @Override
    public StudyHistoryResponse getStudyHistory(UUID userId, LocalDate startDate, LocalDate endDate, String period) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        
        List<UserLearningActivity> currentActivities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);
        
        List<StudySessionResponse> sessions = currentActivities.stream()
                .map(this::mapToStudySession)
                .sorted(Comparator.comparing(StudySessionResponse::getDate).reversed())
                .collect(Collectors.toList());
        
        StatsResponse currentStats = calculateStats(userId, startDate, endDate, currentActivities, period);
        
        Map<String, Integer> dailyActivity = currentActivities.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate().toString(),
                        Collectors.summingInt(a -> 1)
                ));
        
        return StudyHistoryResponse.builder()
                .sessions(sessions)
                .stats(currentStats)
                .dailyActivity(dailyActivity)
                .build();
    }

    private StudySessionResponse mapToStudySession(UserLearningActivity activity) {
        return StudySessionResponse.builder()
                .id(activity.getActivityId())
                .type(activity.getActivityType().name())
                .date(activity.getCreatedAt())
                .duration((long)activity.getDurationInSeconds())
                .score(activity.getScore())
                .maxScore(activity.getMaxScore())
                .experience(activity.getScore() != null ? activity.getScore().intValue() : 0)
                .skills(List.of(activity.getActivityType().name()))
                .completed(true)
                .build();
    }

    private StatsResponse calculateStats(UUID userId, 
                                        LocalDate startDate, 
                                        LocalDate endDate,
                                        List<UserLearningActivity> currentActivities,
                                        String period) {
        long totalTimeSeconds = currentActivities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .mapToLong(UserLearningActivity::getDurationInSeconds)
                .sum();
        
        double averageAccuracy = currentActivities.stream()
                .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null)
                .mapToDouble(a -> (a.getScore().doubleValue() / a.getMaxScore()) * 100)
                .average()
                .orElse(0.0);
        
        long totalCoins = currentActivities.stream()
                .filter(a -> a.getScore() != null)
                .mapToLong(a -> a.getScore().longValue())
                .sum();
        
        long totalExperience = totalCoins; // Giả định 1:1
        
        int lessonsCompleted = (int) currentActivities.stream()
                .filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETION)
                .count();
        
        LocalDate prevStartDate;
        LocalDate prevEndDate;
        
        switch (period.toLowerCase()) {
            case "day" -> {
                prevStartDate = startDate.minusDays(1);
                prevEndDate = startDate.minusDays(1);
            }
            case "month" -> {
                prevStartDate = startDate.minusMonths(1);
                prevEndDate = endDate.minusMonths(1);
            }
            case "year" -> {
                prevStartDate = startDate.minusYears(1);
                prevEndDate = endDate.minusYears(1);
            }
            default -> { // week
                prevStartDate = startDate.minusWeeks(1);
                prevEndDate = endDate.minusWeeks(1);
            }
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
                .mapToDouble(a -> (a.getScore().doubleValue() / a.getMaxScore()) * 100)
                .average()
                .orElse(0.0);
        
        long prevCoins = prevActivities.stream()
                .filter(a -> a.getScore() != null)
                .mapToLong(a -> a.getScore().longValue())
                .sum();
        
        double timeGrowth = calculateGrowthPercent(totalTimeSeconds, prevTimeSeconds);
        double accuracyGrowth = calculateGrowthPercent((long) averageAccuracy, (long) prevAccuracy);
        double coinsGrowth = calculateGrowthPercent(totalCoins, prevCoins);
        
        String weakestSkill = findWeakestSkill(currentActivities);
        
        String aiSuggestion = generateImprovementSuggestion(weakestSkill, averageAccuracy);
        
        List<ChartDataPoint> timeChartData = buildTimeChartData(startDate, endDate, currentActivities);
        List<ChartDataPoint> accuracyChartData = buildAccuracyChartData(startDate, endDate, currentActivities);
        
        return StatsResponse.builder()
                .totalSessions(currentActivities.size())
                .totalTimeSeconds((int) totalTimeSeconds)
                .totalExperience((int) totalExperience)
                .totalCoins((int) totalCoins)
                .lessonsCompleted(lessonsCompleted)
                .averageAccuracy(averageAccuracy)
                .averageScore(averageAccuracy) // Giả định averageScore = averageAccuracy
                .timeGrowthPercent(timeGrowth)
                .accuracyGrowthPercent(accuracyGrowth)
                .coinsGrowthPercent(coinsGrowth)
                .weakestSkill(weakestSkill)
                .improvementSuggestion(aiSuggestion)
                .timeChartData(timeChartData)
                .accuracyChartData(accuracyChartData)
                .build();
    }

    private double calculateGrowthPercent(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return ((double) (current - previous) / previous) * 100.0;
    }

    private String findWeakestSkill(List<UserLearningActivity> activities) {
        Map<ActivityType, Double> skillAccuracies = activities.stream()
                .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null)
                .collect(Collectors.groupingBy(
                        UserLearningActivity::getActivityType,
                        Collectors.averagingDouble(a -> (a.getScore().doubleValue() / a.getMaxScore()) * 100)
                ));
        
        return skillAccuracies.entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .map(e -> e.getKey().name())
                .orElse("NONE");
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

    private List<ChartDataPoint> buildTimeChartData(LocalDate startDate, 
                                                    LocalDate endDate, 
                                                    List<UserLearningActivity> activities) {
        Map<LocalDate, Long> dailyTime = activities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate(),
                        Collectors.summingLong(UserLearningActivity::getDurationInSeconds)
                ));
        
        List<ChartDataPoint> chart = new ArrayList<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            long duration = dailyTime.getOrDefault(cur, 0L);
            chart.add(ChartDataPoint.builder()
                    .label(String.format("%02d/%02d", cur.getDayOfMonth(), cur.getMonthValue()))
                    .value(duration / 60.0) // Convert to minutes
                    .fullDate(cur.toString())
                    .build());
            cur = cur.plusDays(1);
        }
        return chart;
    }

    private List<ChartDataPoint> buildAccuracyChartData(LocalDate startDate, 
                                                        LocalDate endDate, 
                                                        List<UserLearningActivity> activities) {
        Map<LocalDate, Double> dailyAccuracy = activities.stream()
                .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate(),
                        Collectors.averagingDouble(a -> (a.getScore().doubleValue() / a.getMaxScore()) * 100)
                ));
        
        List<ChartDataPoint> chart = new ArrayList<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            double accuracy = dailyAccuracy.getOrDefault(cur, 0.0);
            chart.add(ChartDataPoint.builder()
                    .label(String.format("%02d/%02d", cur.getDayOfMonth(), cur.getMonthValue()))
                    .value(accuracy)
                    .fullDate(cur.toString())
                    .build());
            cur = cur.plusDays(1);
        }
        return chart;
    }


    @Override
    public DashboardStatisticsResponse getDashboardStatistics(UUID userId,
                                                            LocalDate startDate,
                                                            LocalDate endDate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // 1. ✅ FIX: Tính tổng thời gian học từ activities
        List<UserLearningActivity> activities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);
        
        long totalLearningTime = activities.stream()
                .filter(a -> a.getDurationInSeconds() != null)
                .mapToLong(UserLearningActivity::getDurationInSeconds)
                .sum();

        // 2. ✅ FIX: Tính accuracy từ activities có maxScore > 0
        double averageAccuracy = activities.stream()
                .filter(a -> a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null)
                .mapToDouble(a -> (a.getScore().doubleValue() / a.getMaxScore()) * 100)
                .average()
                .orElse(0.0);

        // 3. ✅ FIX: Tính tổng exp/coins từ activities
        long totalScore = activities.stream()
                .filter(a -> a.getScore() != null)
                .mapToLong(a -> a.getScore().longValue())
                .sum();

        // 4. Đếm lessons completed
        int lessonsCompleted = (int) activities.stream()
                .filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETION)
                .count();

        // 5. Đếm badges earned
        int badgesEarnedCount = (int) activities.stream()
                .filter(a -> a.getActivityType() == ActivityType.BADGE_EARNED)
                .count();

        // 6. Tính streak
        int currentStreak = calculateStreak(userId);

        // 7. ✅ FIX: Tính tổng coins từ transactions SUCCESS
        List<Transaction> transactions = transactionRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);
        
        long totalCoins = transactions.stream()
                .filter(t -> t.getStatus() == TransactionStatus.SUCCESS && t.getCurrency() != null && "COIN".equalsIgnoreCase(t.getCurrency()))
                .mapToLong(t -> t.getAmount() != null ? t.getAmount().longValue() : 0)
                .sum();

        // 8. Build DTO
        OverviewMetricsDto overview = OverviewMetricsDto.builder()
                .totalLearningTimeSeconds(totalLearningTime)
                .lessonsCompleted(lessonsCompleted)
                .badgesEarned(badgesEarnedCount)
                .streakDays(currentStreak)
                .averageAccuracy(averageAccuracy)
                .totalExperience(totalScore)
                .totalCoins(totalCoins > 0 ? totalCoins : totalScore) // Fallback to score if no coin transactions
                .build();

        // 9. Build learning time chart
        List<TimeSeriesPoint> learningChart = buildLearningTimeSeries(startDate, endDate, activities);

        // 10. Course progress (giữ nguyên)
        List<CourseVersionEnrollment> enrollments = courseVersionEnrollmentRepository
                .findByUserIdAndIsDeletedFalse(userId);
        List<CourseProgressDto> courseProgressList = new ArrayList<>();
        for (CourseVersionEnrollment e : enrollments) {
            Course course = courseRepository.findById(e.getCourseVersion().getCourseId()).orElse(null);
            CourseVersion version = (course != null) ? course.getLatestPublicVersion() : null;
            if (course == null || version == null) continue;
            try {
                Page<LessonProgressResponse> progressPage = lessonProgressService.getAllLessonProgress(
                        course.getCourseId().toString(),
                        userId.toString(),
                        Pageable.unpaged()
                );
                int completed = (int) progressPage.getContent().stream().filter(LessonProgressResponse::isCompleted).count();
                int totalLessons = (version.getLessons() != null) ? version.getLessons().size() : 0;
                courseProgressList.add(CourseProgressDto.builder()
                        .courseId(course.getCourseId())
                        .courseTitle(course.getTitle())
                        .totalLessons(totalLessons)
                        .completedLessons(completed)
                        .build());
            } catch (Exception ex) {
                // Log error
            }
        }

        // 11. Badge progress
        List<BadgeResponse> earnedBadges = badgeService.getBadgesForUser(userId);
        long totalBadges = badgeRepository.countByIsDeletedFalse();
        BadgeProgressDto badgeProgress = BadgeProgressDto.builder()
                .totalBadgesInSystem((int) totalBadges)
                .earnedBadgesCount(earnedBadges.size())
                .earnedBadges(earnedBadges)
                .build();

        // 12. Transaction summary
        BigDecimal totalSpent = transactions.stream()
                .filter(t -> t.getStatus() == TransactionStatus.SUCCESS && t.getAmount() != null)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        TransactionSummaryDto transactionSummary = TransactionSummaryDto.builder()
                .totalTransactions(transactions.size())
                .totalSpent(totalSpent)
                .build();

        List<UserLearningActivityResponse> recentActivities = userLearningActivityRepository
                .findTop5ByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(userLearningActivityMapper::toUserLearningActivityResponse)
                .collect(Collectors.toList());

        return DashboardStatisticsResponse.builder()
                .overview(overview)
                .learningTimeChart(learningChart)
                .courseProgress(courseProgressList)
                .badgeProgress(badgeProgress)
                .transactionSummary(transactionSummary)
                .recentActivities(recentActivities)
                .build();
    }

    private List<TimeSeriesPoint> buildLearningTimeSeries(LocalDate startDate,
                                                        LocalDate endDate,
                                                        List<UserLearningActivity> activities) {
        Map<LocalDate, Long> dailyDuration = activities.stream()
                .filter(a -> a.getDurationInSeconds() != null && a.getDurationInSeconds() > 0)
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate(),
                        Collectors.summingLong(UserLearningActivity::getDurationInSeconds)
                ));

        List<TimeSeriesPoint> series = new ArrayList<>();
        LocalDate cur = startDate;
        
        while (!cur.isAfter(endDate)) {
            long duration = dailyDuration.getOrDefault(cur, 0L);
            series.add(new TimeSeriesPoint(
                    String.format("%02d/%02d", cur.getDayOfMonth(), cur.getMonthValue()),
                    null, // revenue không dùng cho learning time
                    duration
            ));
            cur = cur.plusDays(1);
        }
        
        return series;
    }

    private List<TimeSeriesPoint> buildTimeSeries(LocalDate startDate,
                                                LocalDate endDate,
                                                String aggregate,
                                                List<Transaction> transactions) {
        if (transactions == null) transactions = Collections.emptyList();
        
        Map<LocalDate, BucketAggregate> byDate = new HashMap<>();
        for (Transaction t : transactions) {
            if (t == null || t.getCreatedAt() == null) continue;
            LocalDate d = t.getCreatedAt().toLocalDate();
            BucketAggregate b = byDate.computeIfAbsent(d, k -> new BucketAggregate(BigDecimal.ZERO, 0L));
            
            boolean shouldAggregateRevenue = t.getAmount() != null &&
                                        (t.getType() == TransactionType.DEPOSIT || "USD".equalsIgnoreCase(t.getCurrency()));
            if (shouldAggregateRevenue) {
                b.revenue = b.revenue.add(t.getAmount());
            }
            b.count++;
        }

        List<BucketRange> buckets = new ArrayList<>();
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        
        if ("day".equalsIgnoreCase(aggregate)) {
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate)) {
                buckets.add(new BucketRange(cur, cur.plusDays(1)));
                cur = cur.plusDays(1);
            }
        } else if ("week".equalsIgnoreCase(aggregate)) {
            long weeksCount = Math.max(1, days / 7);
            long daysPerBucket = Math.max(1, days / Math.min(weeksCount, 7));
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate)) {
                LocalDate next = cur.plusDays(daysPerBucket);
                if (next.isAfter(endDate.plusDays(1))) next = endDate.plusDays(1);
                buckets.add(new BucketRange(cur, next));
                cur = next;
            }
        } else if ("month".equalsIgnoreCase(aggregate)) {
            LocalDate cur = LocalDate.of(startDate.getYear(), startDate.getMonthValue(), 1);
            LocalDate finalMonth = LocalDate.of(endDate.getYear(), endDate.getMonthValue(), 1);
            while (!cur.isAfter(finalMonth)) {
                LocalDate nextMonth = cur.plusMonths(1);
                LocalDate bucketEnd = nextMonth;
                if (cur.equals(finalMonth)) {
                    bucketEnd = endDate.plusDays(1);
                }
                buckets.add(new BucketRange(cur, bucketEnd));
                cur = nextMonth;
            }
        } else if ("year".equalsIgnoreCase(aggregate)) {
            int startYear = startDate.getYear();
            int endYear = endDate.getYear();
            for (int year = startYear; year <= endYear; year++) {
                LocalDate yearStart = LocalDate.of(year, 1, 1);
                LocalDate yearEnd = LocalDate.of(year, 12, 31).plusDays(1);
                if (yearStart.isBefore(startDate)) yearStart = startDate;
                if (yearEnd.isAfter(endDate.plusDays(1))) yearEnd = endDate.plusDays(1);
                buckets.add(new BucketRange(yearStart, yearEnd));
            }
        } else {
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate)) {
                buckets.add(new BucketRange(cur, cur.plusDays(1)));
                cur = cur.plusDays(1);
            }
        }

        List<TimeSeriesPoint> series = new ArrayList<>();
        int labelIdx = 1;
        for (BucketRange b : buckets) {
            BigDecimal sum = BigDecimal.ZERO;
            long cnt = 0;
            LocalDate d = b.start;
            while (d.isBefore(b.end)) {
                BucketAggregate ag = byDate.get(d);
                if (ag != null) {
                    sum = sum.add(ag.revenue);
                    cnt += ag.count;
                }
                d = d.plusDays(1);
            }

            String label = switch (aggregate.toLowerCase()) {
                case "day" -> String.format("%02d/%02d", b.start.getDayOfMonth(), b.start.getMonthValue());
                case "week" -> "W" + labelIdx++;
                case "month" -> b.start.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, Locale.ENGLISH);
                case "year" -> String.valueOf(b.start.getYear());
                default -> b.start.toString();
            };

            series.add(new TimeSeriesPoint(label, sum, cnt));
        }

        return series;
    }

    @Override
    public StatisticsOverviewResponse getOverview(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<User> users = userRepository.findByCreatedAtBetween(start, end);
        long totalUsers = users != null ? users.size() : 0L;

        int totalCourses;
        if (userId != null) {
            List<CourseVersionEnrollment> enrollments = courseVersionEnrollmentRepository.findByUserIdAndEnrolledAtBetween(userId, start, end);
            totalCourses = enrollments != null ? enrollments.size() : 0;
        } else {
            List<Course> courses = courseRepository.findByCreatedAtBetweenAndIsDeletedFalse(start, end);
            totalCourses = courses != null ? courses.size() : 0;
        }

        List<UserLearningActivity> activities = userId != null
                ? userLearningActivityRepository.findByUserIdAndCreatedAtBetween(userId, start, end)
                : userLearningActivityRepository.findByCreatedAtBetween(start, end);
        int totalLessons = 0;
        if (activities != null) {
            totalLessons = (int) activities.stream()
                    .filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETION)
                    .count();
        }

        List<Transaction> transactions = userId != null
                ? transactionRepository.findByUserIdAndCreatedAtBetween(userId, start, end)
                : transactionRepository.findByCreatedAtBetween(start, end);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalTransactions = 0;
        if (transactions != null && !transactions.isEmpty()) {
            totalRevenue = transactions.stream()
                    .filter(t -> t.getAmount() != null && "USD".equalsIgnoreCase(t.getCurrency()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalTransactions = transactions.size();
        }

        List<TimeSeriesPoint> series = buildTimeSeries(startDate, endDate, aggregate, transactions);

        return new StatisticsOverviewResponse(totalUsers, totalCourses, totalLessons,
                totalRevenue, totalTransactions, series);
    }

    @Override
    public StatisticsResponse getUserStatistics(UUID userId,
                                                LocalDate startDate,
                                                LocalDate endDate,
                                                String aggregate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<Transaction> transactions = transactionRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);
        BigDecimal totalAmount = transactions.stream()
                .filter(t -> t.getAmount() != null)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalTransactions = transactions.size();

        List<UserLearningActivity> activities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);
        Map<String, Long> breakdown = activities.stream()
                .collect(Collectors.groupingBy(a -> a.getActivityType().name(), Collectors.counting()));

        int lessonsCompleted = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.LESSON_COMPLETION, start, end);
        int quizzesCompleted = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.QUIZ_COMPLETE, start, end);
        int groupSessions = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.GROUP_SESSION_JOINED, start, end);
        int examsTaken = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.EXAM, start, end);

        List<CourseVersionEnrollment> enrollments = courseVersionEnrollmentRepository
                .findByUserIdAndEnrolledAtBetween(userId, start, end);
        int coursesEnrolled = enrollments.size();

        List<UserDailyChallenge> challenges = userDailyChallengeRepository
                .findByUser_UserIdAndCompletedAtBetween(userId, start, end);
        int challengesCompleted = (int) challenges.stream().filter(UserDailyChallenge::getCompleted).count();

        List<UserEvent> events = userEventRepository
                .findById_UserIdAndParticipatedAtBetween(userId, start, end);
        int eventsParticipated = events.size();

        List<VideoCallParticipant> calls = videoCallParticipantRepository
                .findByUser_UserIdAndJoinedAtBetween(userId, start, end);
        int callsJoined = calls.size();

        StatisticsResponse resp = new StatisticsResponse();
        resp.setTotalLessonsCompleted(lessonsCompleted);
        resp.setTotalCoursesEnrolled(coursesEnrolled);
        resp.setTotalQuizzesCompleted(quizzesCompleted);
        resp.setTotalGroupSessionsJoined(groupSessions);
        resp.setTotalExamsTaken(examsTaken);
        resp.setTotalDailyChallengesCompleted(challengesCompleted);
        resp.setTotalEventsParticipated(eventsParticipated);
        resp.setTotalVideoCallsJoined(callsJoined);
        resp.setTotalTransactionAmount(totalAmount);
        resp.setTotalTransactions(totalTransactions);
        resp.setActivityBreakdown(breakdown);

        List<TimeSeriesPoint> ts = buildTimeSeries(startDate, endDate,
                aggregate != null ? aggregate : "day", transactions);
        resp.setTimeSeries(ts);

        return resp;
    }

    @Override
    public DepositRevenueResponse getDepositRevenueStatistics(LocalDate startDate, LocalDate endDate, String aggregate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<Transaction> depositTransactions = transactionRepository
                .findByTypeAndStatusAndCreatedAtBetween(
                        TransactionType.DEPOSIT,
                        TransactionStatus.SUCCESS,
                        start,
                        end
                );

        BigDecimal totalDepositRevenue = BigDecimal.ZERO;
        if (depositTransactions != null) {
            totalDepositRevenue = depositTransactions.stream()
                    .filter(t -> t.getAmount() != null)
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        List<TimeSeriesPoint> revenueTimeSeries = buildTimeSeries(startDate, endDate, aggregate, depositTransactions);

        return new DepositRevenueResponse(totalDepositRevenue, revenueTimeSeries);
    }
    
    @Override
    public List<UserCountResponse> getUserCounts(String period, LocalDate startDate, LocalDate endDate) {
        return new ArrayList<>(); 
    }

    @Override
    public List<UserCountResponse> getUserGrowth(String period, LocalDate startDate, LocalDate endDate) {
        return new ArrayList<>();
    }

    @Override
    public List<ActivityCountResponse> getActivityStatistics(String activityType, LocalDate startDate, LocalDate endDate, String period) {
        return new ArrayList<>();
    }

    @Override
    public List<TransactionStatsResponse> getTransactionStatistics(String status, String provider, LocalDate startDate, LocalDate endDate, String period) {
        return new ArrayList<>();
    }

    @Override
    public TeacherOverviewResponse getTeacherOverview(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return new TeacherOverviewResponse(); 
    }

    @Override
    public List<CoursePerformanceResponse> getTeacherCoursesPerformance(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return new ArrayList<>();
    }

    @Override
    public List<LessonStatsResponse> getTeacherCourseLessonStats(UUID teacherId, UUID courseId, LocalDate startDate, LocalDate endDate) {
        return new ArrayList<>();
    }

    @Override
    public List<TimeSeriesPoint> getTeacherCourseRevenue(UUID teacherId, UUID courseId, LocalDate startDate, LocalDate endDate, String aggregate) {
        return new ArrayList<>();
    }
}