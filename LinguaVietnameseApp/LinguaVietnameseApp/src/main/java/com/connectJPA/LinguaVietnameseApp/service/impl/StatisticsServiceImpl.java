package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
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
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatisticsServiceImpl implements StatisticsService {

    private final UserRepository userRepository;
    private final UserLearningActivityRepository activityRepository;
    private final TransactionRepository transactionRepository;
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final VideoCallParticipantRepository videoCallParticipantRepository;
    private final UserEventRepository userEventRepository;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final BadgeService badgeService;
    private final LessonProgressService lessonProgressService;
    private final UserLearningActivityMapper userLearningActivityMapper;
    private final BadgeRepository badgeRepository;

    /* --------------------------------------------------------------------- */
    /* DASHBOARD STATISTICS                                                 */
    /* --------------------------------------------------------------------- */
    @Override
    public DashboardStatisticsResponse getDashboardStatistics(UUID userId,
                                                              LocalDate startDate,
                                                              LocalDate endDate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // 1. Activities in range
        List<UserLearningActivity> activities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);

        // 2. Overview metrics
        long totalLearningTime = activities.stream()
                .filter(a -> (a.getActivityType() == ActivityType.LESSON_END ||
                        a.getActivityType() == ActivityType.CHAT_END) &&
                        a.getDurationInSeconds() != null)
                .mapToLong(UserLearningActivity::getDurationInSeconds)
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
                .streakDays(0)                     // TODO: implement streak logic
                .build();

        // 3. Learning time chart
        List<TimeSeriesPoint> learningChart = buildLearningTimeSeries(startDate, endDate, activities);

        // 4. Course progress
        List<CourseEnrollment> enrollments = courseEnrollmentRepository
                .findByUserIdAndIsDeletedFalse(userId);

        List<CourseProgressDto> courseProgressList = new ArrayList<>();
        for (CourseEnrollment e : enrollments) {
            // SỬA: Lấy Course trực tiếp từ quan hệ
            Course course = e.getCourseVersion().getCourse();

            // Lấy version public mới nhất
            CourseVersion version = (course != null) ? course.getLatestPublicVersion() : null;
            if (course == null || version == null) continue;

            // TODO: 'lessonProgressService.getAllLessonProgress' cũng có thể bị lỗi
            Page<LessonProgressResponse> progressPage = lessonProgressService.getAllLessonProgress(
                    course.getCourseId().toString(),
                    userId.toString(),
                    Pageable.unpaged()
            );

            int completed = (int) progressPage.getContent()
                    .stream()
                    .filter(LessonProgressResponse::isCompleted)
                    .count();

            // === SỬA LỖI 1 ===
            // Lấy tổng số bài học từ 'version'
            int totalLessons = (version.getLessons() != null) ? version.getLessons().size() : 0;

            courseProgressList.add(CourseProgressDto.builder()
                    .courseId(course.getCourseId())
                    .courseTitle(course.getTitle())
                    .totalLessons(totalLessons) // ĐÃ SỬA
                    .completedLessons(completed)
                    .build());
        }

        // 5. Badge progress
        List<BadgeResponse> earnedBadges = badgeService.getBadgesForUser(userId);
        long totalBadges = badgeRepository.countByIsDeletedFalse();

        BadgeProgressDto badgeProgress = BadgeProgressDto.builder()
                .totalBadgesInSystem((int) totalBadges)
                .earnedBadgesCount(earnedBadges.size())
                .earnedBadges(earnedBadges)
                .build();

        // 6. Transaction summary
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

        // 7. Recent activities (top 5)
        List<UserLearningActivityResponse> recentActivities = userLearningActivityRepository
                .findTop5ByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(userLearningActivityMapper::toResponse)
                .collect(Collectors.toList());

        // 8. Build final response
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
                        a.getActivityType() == ActivityType.CHAT_END) &&
                        a.getDurationInSeconds() != null)
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
                    null,
                    duration
            ));
            cur = cur.plusDays(1);
        }
        return series;
    }

    /* --------------------------------------------------------------------- */
    /* OVERVIEW (admin)                                                    */
    /* --------------------------------------------------------------------- */
    @Override
    public StatisticsOverviewResponse getOverview(UUID userId,
                                                  LocalDate startDate,
                                                  LocalDate endDate,
                                                  String aggregate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // Users
        List<User> users = userRepository.findByCreatedAtBetween(start, end);
        long totalUsers = users != null ? users.size() : 0L;

        // Enrollments
        List<CourseEnrollment> enrollments = userId != null
                ? courseEnrollmentRepository.findByUserIdAndEnrolledAtBetween(userId, start, end)
                : courseEnrollmentRepository.findByEnrolledAtBetween(start, end);
        int totalCourses = enrollments != null ? enrollments.size() : 0;

        // Activities
        List<UserLearningActivity> activities = userId != null
                ? userLearningActivityRepository.findByUserIdAndCreatedAtBetween(userId, start, end)
                : userLearningActivityRepository.findByCreatedAtBetween(start, end);
        int totalLessons = 0;
        if (activities != null) {
            totalLessons = (int) activities.stream()
                    .filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETION)
                    .count();
        }

        // Transactions
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
            if (t.getAmount() != null && "USD".equalsIgnoreCase(t.getCurrency())) {
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
            // fallback daily
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
                case "week" -> "Week " + weekIdx++;
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
        // (Thêm getter để tránh lỗi nếu BucketAggregate là private)
        BigDecimal getRevenue() { return revenue; }
        long getCount() { return count; }
    }
    private static class BucketRange {
        LocalDate start, end; // end exclusive
        BucketRange(LocalDate s, LocalDate e) { start = s; end = e; }
    }

    /* --------------------------------------------------------------------- */
    /* USER STATISTICS                                                     */
    /* --------------------------------------------------------------------- */
    @Override
    public StatisticsResponse getUserStatistics(UUID userId,
                                                LocalDate startDate,
                                                LocalDate endDate,
                                                String aggregate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // Transactions
        List<Transaction> transactions = transactionRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);
        BigDecimal totalAmount = transactions.stream()
                .filter(t -> t.getAmount() != null)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalTransactions = transactions.size();

        // Activities
        List<UserLearningActivity> activities = userLearningActivityRepository
                .findByUserIdAndCreatedAtBetween(userId, start, end);
        Map<String, Long> breakdown = activities.stream()
                .collect(Collectors.groupingBy(a -> a.getActivityType().name(), Collectors.counting()));

        int lessonsCompleted = breakdown.getOrDefault(ActivityType.LESSON_COMPLETION.toString(), 0L).intValue();
        int quizzesCompleted = breakdown.getOrDefault(ActivityType.QUIZ_COMPLETE.toString(), 0L).intValue();
        int groupSessions   = breakdown.getOrDefault(ActivityType.GROUP_SESSION_JOINED.toString(), 0L).intValue();
        int examsTaken      = breakdown.getOrDefault(ActivityType.EXAM.toString(), 0L).intValue();

        // Enrollments
        List<CourseEnrollment> enrollments = courseEnrollmentRepository
                .findByUserIdAndEnrolledAtBetween(userId, start, end);
        int coursesEnrolled = enrollments.size();

        // Challenges / Events / Calls
        List<UserDailyChallenge> challenges = userDailyChallengeRepository
                .findByUser_UserIdAndCreatedAtBetween(userId, start, end);
        int challengesCompleted = (int) challenges.stream().filter(UserDailyChallenge::isCompleted).count();

        List<UserEvent> events = userEventRepository
                .findById_UserIdAndParticipatedAtBetween(userId, start, end);
        int eventsParticipated = events.size();

        List<VideoCallParticipant> calls = videoCallParticipantRepository
                .findByUser_UserIdAndJoinedAtBetween(userId, start, end);
        int callsJoined = calls.size();

        // Build response
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

    /* --------------------------------------------------------------------- */
    /* USER COUNT / GROWTH                                                 */
    /* --------------------------------------------------------------------- */
    @Override
    public List<UserCountResponse> getUserCounts(String period, LocalDate startDate, LocalDate endDate) {
        List<User> users = userRepository.findByCreatedAtBetween(
                startDate.atStartOfDay().atOffset(ZoneOffset.UTC),
                endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        return aggregateUserCounts(users, period);
    }

    @Override
    public List<UserCountResponse> getUserGrowth(String period, LocalDate startDate, LocalDate endDate) {
        List<User> users = userRepository.findByCreatedAtBetween(
                startDate.atStartOfDay().atOffset(ZoneOffset.UTC),
                endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        List<UserCountResponse> counts = aggregateUserCounts(users, period);
        return calculateGrowth(counts);
    }

    private List<UserCountResponse> aggregateUserCounts(List<User> users, String period) {
        DateTimeFormatter fmt = getFormatter(period);
        Map<String, Long> map = users.stream()
                .collect(Collectors.groupingBy(u -> u.getCreatedAt().toLocalDate().format(fmt), Collectors.counting()));

        List<UserCountResponse> list = new ArrayList<>();
        map.forEach((p, c) -> {
            UserCountResponse r = new UserCountResponse();
            r.setPeriod(p);
            r.setNewUsers(c);
            r.setTotalUsers(0L); // placeholder – can be filled later if needed
            list.add(r);
        });
        list.sort(Comparator.comparing(UserCountResponse::getPeriod));
        return list;
    }

    private List<UserCountResponse> calculateGrowth(List<UserCountResponse> counts) {
        for (int i = 1; i < counts.size(); i++) {
            long prev = counts.get(i - 1).getNewUsers();
            long cur  = counts.get(i).getNewUsers();
            counts.get(i).setNewUsers(cur - prev);
            if (prev != 0) {
                counts.get(i).setTotalUsers(Math.round((cur - prev) * 100.0 / prev));
            }
        }
        return counts;
    }

    /* --------------------------------------------------------------------- */
    /* ACTIVITY / TRANSACTION AGGREGATIONS                                 */
    /* --------------------------------------------------------------------- */
    @Override
    public List<ActivityCountResponse> getActivityStatistics(String activityType,
                                                             LocalDate startDate,
                                                             LocalDate endDate,
                                                             String period) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end   = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<UserLearningActivity> activities = userLearningActivityRepository
                .findByCreatedAtBetween(start, end);

        if (activityType != null) {
            activities = activities.stream()
                    .filter(a -> a.getActivityType().name().equalsIgnoreCase(activityType))
                    .collect(Collectors.toList());
        }
        return aggregateActivities(activities, period != null ? period : "day");
    }

    @Override
    public List<TransactionStatsResponse> getTransactionStatistics(String status,
                                                                   String provider,
                                                                   LocalDate startDate,
                                                                   LocalDate endDate,
                                                                   String period) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end   = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<Transaction> txs = transactionRepository.findByCreatedAtBetween(start, end);

        if (status != null) {
            txs = txs.stream()
                    .filter(t -> t.getStatus() != null && t.getStatus().name().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }
        if (provider != null) {
            txs = txs.stream()
                    .filter(t -> t.getProvider() != null && t.getProvider().name().equalsIgnoreCase(provider))
                    .collect(Collectors.toList());
        }
        return aggregateTransactions(txs, period != null ? period : "day");
    }

    private List<ActivityCountResponse> aggregateActivities(List<UserLearningActivity> activities,
                                                            String period) {
        DateTimeFormatter fmt = getFormatter(period);
        Map<String, Map<String, Long>> map = activities.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate().format(fmt),
                        Collectors.groupingBy(a -> a.getActivityType().name(), Collectors.counting())));

        List<ActivityCountResponse> list = new ArrayList<>();
        map.forEach((p, typeMap) -> typeMap.forEach((t, c) -> {
            ActivityCountResponse r = new ActivityCountResponse();
            r.setPeriod(p);
            r.setActivityType(t);
            r.setCount(c);
            list.add(r);
        }));
        list.sort(Comparator.comparing(ActivityCountResponse::getPeriod));
        return list;
    }

    private static class TxnAggregate {
        long count;
        BigDecimal total;
        TxnAggregate(long c, BigDecimal t) { count = c; total = t; }
        long getCount() { return count; }
        BigDecimal getTotal() { return total; }
    }

    private List<TransactionStatsResponse> aggregateTransactions(List<Transaction> transactions,
                                                                 String period) {
        DateTimeFormatter fmt = getFormatter(period);
        Map<String, Map<String, Map<String, TxnAggregate>>> map = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getCreatedAt().toLocalDate().format(fmt),
                        Collectors.groupingBy(t -> t.getStatus().name(),
                                Collectors.groupingBy(t -> t.getProvider().name(),
                                        Collectors.reducing(
                                                new TxnAggregate(0L, BigDecimal.ZERO),
                                                tx -> new TxnAggregate(1L,
                                                        tx.getAmount() == null ? BigDecimal.ZERO : tx.getAmount()),
                                                (a1, a2) -> new TxnAggregate(
                                                        a1.getCount() + a2.getCount(),
                                                        a1.getTotal().add(a2.getTotal())
                                                ))))));

        List<TransactionStatsResponse> list = new ArrayList<>();
        map.forEach((p, statusMap) ->
                statusMap.forEach((s, provMap) ->
                        provMap.forEach((pr, agg) -> {
                            TransactionStatsResponse r = new TransactionStatsResponse();
                            r.setPeriod(p);
                            r.setStatus(s);
                            r.setProvider(pr);
                            r.setCount(agg.getCount());
                            r.setTotalAmount(agg.getTotal());
                            list.add(r);
                        })));
        list.sort(Comparator.comparing(TransactionStatsResponse::getPeriod));
        return list;
    }

    private DateTimeFormatter getFormatter(String period) {
        return switch (period == null ? "day" : period) {
            case "month" -> DateTimeFormatter.ofPattern("yyyy-MM");
            case "year"  -> DateTimeFormatter.ofPattern("yyyy");
            default      -> DateTimeFormatter.ofPattern("yyyy-MM-dd");
        };
    }

    /* --------------------------------------------------------------------- */
    /* TEACHER METHODS                                                      */
    /* --------------------------------------------------------------------- */
    @Override
    public TeacherOverviewResponse getTeacherOverview(UUID teacherId,
                                                      LocalDate startDate,
                                                      LocalDate endDate,
                                                      String aggregate) {
        if (teacherId == null) throw new IllegalArgumentException("teacherId is required");

        List<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(teacherId);
        if (courses == null) courses = Collections.emptyList();

        int totalCourses = courses.size();

        // === SỬA LỖI 2 ===
        // Đếm lessons từ các 'latestPublicVersion'
        int totalLessons = 0;
        for (Course c : courses) {
            // Chỉ đếm lesson của các khóa đã public
            CourseVersion v = c.getLatestPublicVersion();
            if (v != null && v.getStatus() == VersionStatus.PUBLIC && v.getLessons() != null) {
                totalLessons += v.getLessons().size();
            }
        }
        // DÒNG CŨ BỊ LỖI: List<Lesson> lessons = lessonRepository.findByCourseVersion_Course_CourseIdIn(courseIds);

        List<UUID> courseIds = courses.stream().map(Course::getCourseId).collect(Collectors.toList());

        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end   = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        long totalStudents = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalTransactions = 0;

        if (!courseIds.isEmpty()) {
            List<CourseEnrollment> enrolls = courseEnrollmentRepository
                    .findByCourseVersion_Course_CourseIdInAndEnrolledAtBetween(courseIds, start, end);
            totalStudents = enrolls.stream()
                    .map(CourseEnrollment::getUserId)
                    .distinct()
                    .count();

            List<Transaction> txs = transactionRepository.findByCreatedAtBetween(start, end);
            Set<UUID> enrolledUsers = enrolls.stream()
                    .map(CourseEnrollment::getUserId)
                    .collect(Collectors.toSet());

            List<Transaction> relevant = txs.stream()
                    .filter(t -> {
                        // (Logic reflection này khá rủi ro, nhưng giữ nguyên)
                        try {
                            java.lang.reflect.Method m = t.getClass().getMethod("getCourseId");
                            Object cid = m.invoke(t);
                            if (cid instanceof UUID && courseIds.contains(cid)) return true;
                        } catch (Exception ignored) {}
                        return t.getUserId() != null && enrolledUsers.contains(t.getUserId());
                    })
                    .collect(Collectors.toList());

            totalTransactions = relevant.size();
            totalRevenue = relevant.stream()
                    .filter(tx -> tx.getAmount() != null && "USD".equalsIgnoreCase(tx.getCurrency()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        List<Transaction> seriesTx = new ArrayList<>();
        if (!courseIds.isEmpty()) {
            OffsetDateTime fullStart = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime fullEnd   = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
            List<Transaction> allTx = transactionRepository.findByCreatedAtBetween(fullStart, fullEnd);
            Set<UUID> enrolledAll = courseEnrollmentRepository.findByCourseVersion_Course_CourseIdIn(courseIds).stream()
                    .map(CourseEnrollment::getUserId)
                    .collect(Collectors.toSet());

            seriesTx = allTx.stream()
                    .filter(t -> {
                        try {
                            java.lang.reflect.Method m = t.getClass().getMethod("getCourseId");
                            Object cid = m.invoke(t);
                            if (cid instanceof UUID && courseIds.contains(cid)) return true;
                        } catch (Exception ignored) {}
                        return t.getUserId() != null && enrolledAll.contains(t.getUserId());
                    })
                    .collect(Collectors.toList());
        }

        List<TimeSeriesPoint> series = buildTimeSeries(startDate, endDate, aggregate, seriesTx);

        TeacherOverviewResponse resp = new TeacherOverviewResponse();
        resp.setTotalCourses(totalCourses);
        resp.setTotalLessons(totalLessons);
        resp.setTotalStudents(totalStudents);
        resp.setTotalRevenue(totalRevenue);
        resp.setTotalTransactions(totalTransactions);
        resp.setTimeSeries(series);
        return resp;
    }

    @Override
    public List<CoursePerformanceResponse> getTeacherCoursesPerformance(UUID teacherId,
                                                                        LocalDate startDate,
                                                                        LocalDate endDate,
                                                                        String aggregate) {
        if (teacherId == null) throw new IllegalArgumentException("teacherId is required");

        List<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(teacherId);
        if (courses == null) courses = Collections.emptyList();

        List<CoursePerformanceResponse> result = new ArrayList<>();
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end   = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        for (Course c : courses) {
            CoursePerformanceResponse cp = new CoursePerformanceResponse();
            cp.setCourseId(c.getCourseId());
            cp.setTitle(c.getTitle());

            // === SỬA LỖI 3 ===
            // Lấy lessons từ version (public hoặc draft)
            CourseVersion version = c.getLatestPublicVersion();
            int lessonsCount = (version != null && version.getLessons() != null) ? version.getLessons().size() : 0;
            cp.setLessonsCount(lessonsCount);
            // DÒNG CŨ BỊ LỖI: List<Lesson> lessons = lessonRepository.findByCourseIdAndIsDeletedFalse(c.getCourseId());

            List<CourseEnrollment> enrolls = courseEnrollmentRepository
                    .findByCourseVersion_Course_CourseIdAndEnrolledAtBetween(c.getCourseId(), start, end);
            cp.setStudentsCount(enrolls.stream()
                    .map(CourseEnrollment::getUserId)
                    .distinct()
                    .count());

            List<Transaction> txs = transactionRepository.findByCreatedAtBetween(start, end);
            List<Transaction> relevant = txs.stream()
                    .filter(t -> {
                        try {
                            java.lang.reflect.Method m = t.getClass().getMethod("getCourseId");
                            Object cid = m.invoke(t);
                            if (cid instanceof UUID && c.getCourseId().equals(cid)) return true;
                        } catch (Exception ignored) {}
                        return t.getUserId() != null && enrolls.stream()
                                .anyMatch(e -> e.getUserId().equals(t.getUserId()));
                    })
                    .collect(Collectors.toList());

            BigDecimal rev = relevant.stream()
                    .filter(r -> r.getAmount() != null && "USD".equalsIgnoreCase(r.getCurrency()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            cp.setRevenue(rev);
            cp.setTransactions(relevant.size());

            cp.setTimeSeries(buildTimeSeries(startDate, endDate, aggregate, relevant));
            result.add(cp);
        }
        return result;
    }

    @Override
    public List<LessonStatsResponse> getTeacherCourseLessonStats(UUID teacherId,
                                                                 UUID courseId,
                                                                 LocalDate startDate,
                                                                 LocalDate endDate) {
        Course course = courseRepository.findByCourseIdAndIsDeletedFalse(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        if (!course.getCreatorId().equals(teacherId))
            throw new SecurityException("Not course owner");

        // === SỬA LỖI 4 ===
        // Lấy lessons từ version (public hoặc draft)
        CourseVersion version = course.getLatestPublicVersion();
        if (version == null || version.getLessons() == null) {
            return Collections.emptyList(); // Không có bài học
        }
        // Lấy danh sách Lesson thực tế
        List<Lesson> lessons = version.getLessons().stream()
                .map(CourseVersionLesson::getLesson)
                .collect(Collectors.toList());
        // DÒNG CŨ BỊ LỖI: List<Lesson> lessons = lessonRepository.findByCourseIdAndIsDeletedFalse(courseId);

        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end   = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<LessonStatsResponse> out = new ArrayList<>();
        for (Lesson l : lessons) {
            List<UserLearningActivity> acts = userLearningActivityRepository.findLessonActivities(
                    l.getLessonId(),
                    List.of(ActivityType.LESSON_COMPLETE, ActivityType.LESSON_COMPLETION),
                    start, end);

            long completions = acts.stream()
                    .filter(a -> a.getActivityType() == ActivityType.LESSON_COMPLETION)
                    .count();

            LessonStatsResponse r = new LessonStatsResponse();
            r.setLessonId(l.getLessonId());
            r.setLessonName(l.getLessonName());
            r.setExpReward(l.getExpReward());
            r.setCompletions(completions);
            out.add(r);
        }
        return out;
    }

    @Override
    public List<TimeSeriesPoint> getTeacherCourseRevenue(UUID teacherId,
                                                         UUID courseId,
                                                         LocalDate startDate,
                                                         LocalDate endDate,
                                                         String aggregate) {
        Course course = courseRepository.findByCourseIdAndIsDeletedFalse(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        if (!course.getCreatorId().equals(teacherId))
            throw new SecurityException("Not course owner");

        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end   = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<Transaction> txs = transactionRepository.findByCreatedAtBetween(start, end);
        List<Transaction> relevant = txs.stream()
                .filter(t -> {
                    try {
                        java.lang.reflect.Method m = t.getClass().getMethod("getCourseId");
                        Object cid = m.invoke(t);
                        if (cid instanceof UUID && courseId.equals(cid)) return true;
                    } catch (Exception ignored) {}
                    return courseEnrollmentRepository.findByCourseVersion_Course_CourseIdAndIsDeletedFalse(courseId)
                            .stream()
                            .map(CourseEnrollment::getUserId).isParallel();
                })
                .collect(Collectors.toList());

        return buildTimeSeries(startDate, endDate, aggregate, relevant);
    }
}