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

    /* --------------------------------------------------------------------- */
    /* UTILITY METHODS */
    /* --------------------------------------------------------------------- */
    
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
            
            // CHỈ SỬ DỤNG GIAO DỊCH CÓ TIỀN TỆ USD HOẶC ĐANG LÀ DEPOSIT ĐỂ THỐNG KÊ (nếu là DEPOSIT, tính tất cả, giả định FE sẽ quy đổi)
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
            long chunk = Math.max(1, (long) Math.ceil(days / 4.0));
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate)) {
                LocalDate next = cur.plusDays(chunk);
                if (next.isAfter(endDate.plusDays(1))) next = endDate.plusDays(1);
                buckets.add(new BucketRange(cur, next));
                cur = next;
            }
        } else if ("month".equalsIgnoreCase(aggregate)) {
            LocalDate cur = LocalDate.of(startDate.getYear(), startDate.getMonth(), 1);
            LocalDate finalMonth = LocalDate.of(endDate.getYear(), endDate.getMonth(), 1);
            while (!cur.isAfter(finalMonth)) {
                buckets.add(new BucketRange(cur, cur.plusMonths(1)));
                cur = cur.plusMonths(1);
            }
        } else {
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate)) {
                buckets.add(new BucketRange(cur, cur.plusDays(1)));
                cur = cur.plusDays(1);
            }
        }

        List<TimeSeriesPoint> series = new ArrayList<>();
        int weekIdx = 1;
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
                case "week" -> "W" + weekIdx++;
                case "month" -> b.start.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, Locale.ENGLISH);
                default -> b.start.toString();
            };
            series.add(new TimeSeriesPoint(label, sum, cnt));
        }
        return series;
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

    /* --------------------------------------------------------------------- */
    /* DEPOSIT REVENUE STATISTICS - NEW */
    /* --------------------------------------------------------------------- */

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
                    .filter(t -> t.getAmount() != null) // BỎ QUA KIỂM TRA TIỀN TỆ Ở ĐÂY
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        List<TimeSeriesPoint> revenueTimeSeries = buildTimeSeries(startDate, endDate, aggregate, depositTransactions);

        return new DepositRevenueResponse(totalDepositRevenue, revenueTimeSeries);
    }
    
    
    /* --------------------------------------------------------------------- */
    /* DASHBOARD STATISTICS                                                  */
    /* --------------------------------------------------------------------- */
    @Override
    public DashboardStatisticsResponse getDashboardStatistics(UUID userId,
                                                            LocalDate startDate,
                                                            LocalDate endDate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<UserLearningActivity> activities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);

        long totalLearningTime = activities.stream()
                .filter(a -> (a.getActivityType() == ActivityType.LESSON_END ||
                        a.getActivityType() == ActivityType.CHAT_END))
                .mapToLong(a -> a.getDurationInSeconds() != null ? a.getDurationInSeconds() : 0L)
                .sum();

        long lessonsCompleted = activities.stream()
                .filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETION)
                .count();

        long badgesEarned = activities.stream()
                .filter(a -> a.getActivityType() == ActivityType.BADGE_EARNED)
                .count();

        OverviewMetricsDto overview = OverviewMetricsDto.builder()
                .totalLearningTimeSeconds(totalLearningTime)
                .lessonsCompleted(lessonsCompleted)
                .badgesEarned(badgesEarned)
                .streakDays(0)
                .build();

        List<TimeSeriesPoint> learningChart = buildLearningTimeSeries(startDate, endDate, activities);

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
            }
        }

        List<BadgeResponse> earnedBadges = badgeService.getBadgesForUser(userId);
        long totalBadges = badgeRepository.countByIsDeletedFalse();

        BadgeProgressDto badgeProgress = BadgeProgressDto.builder()
                .totalBadgesInSystem((int) totalBadges)
                .earnedBadgesCount(earnedBadges.size())
                .earnedBadges(earnedBadges)
                .build();

        List<Transaction> transactions = transactionRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);

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
                .filter(a -> (a.getActivityType() == ActivityType.LESSON_END ||
                        a.getActivityType() == ActivityType.CHAT_END))
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate(),
                        Collectors.summingLong(a -> a.getDurationInSeconds() != null ? a.getDurationInSeconds() : 0L)
                ));

        List<TimeSeriesPoint> series = new ArrayList<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            long duration = dailyDuration.getOrDefault(cur, 0L);
            series.add(new TimeSeriesPoint(
                    String.format("%02d/%02d", cur.getDayOfMonth(), cur.getMonthValue()),
                    null,
                    duration
            ));
            cur = cur.plusDays(1);
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

        int lessonsCompleted = breakdown.getOrDefault(ActivityType.LESSON_COMPLETION.toString(), 0L).intValue();
        int quizzesCompleted = breakdown.getOrDefault(ActivityType.QUIZ_COMPLETE.toString(), 0L).intValue();
        int groupSessions = breakdown.getOrDefault(ActivityType.GROUP_SESSION_JOINED.toString(), 0L).intValue();
        int examsTaken = breakdown.getOrDefault(ActivityType.EXAM.toString(), 0L).intValue();

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