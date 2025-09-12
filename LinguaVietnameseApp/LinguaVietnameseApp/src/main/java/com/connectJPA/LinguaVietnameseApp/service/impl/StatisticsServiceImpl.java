package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import com.connectJPA.LinguaVietnameseApp.dto.TxnAggregate;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.repository.*;
import com.connectJPA.LinguaVietnameseApp.service.StatisticsService;
import lombok.RequiredArgsConstructor;
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


    @Override
    public StatisticsOverviewResponse getOverview(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // --- existing totals (reuse your current logic) ---
        List<User> usersInRange = userRepository.findByCreatedAtBetween(start, end);
        long totalUsers = usersInRange == null ? 0L : usersInRange.size();

        int totalCourses;
        List<?> enrollments;
        if (userId != null) {
            enrollments = courseEnrollmentRepository.findByUserIdAndEnrolledAtBetween(userId, start, end);
        } else {
            enrollments = courseEnrollmentRepository.findByEnrolledAtBetween(start, end);
        }
        totalCourses = enrollments == null ? 0 : enrollments.size();

        List<UserLearningActivity> activities;
        if (userId != null) {
            activities = userLearningActivityRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
        } else {
            activities = userLearningActivityRepository.findByCreatedAtBetween(start, end);
        }
        int totalLessons = 0;
        if (activities != null) {
            totalLessons = (int) activities.stream()
                    .filter(a -> a.getActivityType() != null && a.getActivityType().name().equalsIgnoreCase(ActivityType.LESSON_COMPLETION.toString()))
                    .count();
        }

        List<Transaction> transactions;
        if (userId != null) {
            transactions = transactionRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
        } else {
            transactions = transactionRepository.findByCreatedAtBetween(start, end);
        }

        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalTransactions = 0;
        if (transactions != null && !transactions.isEmpty()) {
            totalRevenue = transactions.stream()
                    .filter(t -> t != null && t.getAmount() != null && "USD".equalsIgnoreCase(t.getCurrency()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalTransactions = transactions.size();
        }

        // --- build time series according to 'aggregate' ---
        List<TimeSeriesPoint> series = buildTimeSeries(startDate, endDate, aggregate, transactions);

        return new StatisticsOverviewResponse(totalUsers, totalCourses, totalLessons, totalRevenue, totalTransactions, series);
    }

    /**
     * aggregate: "day" | "week" | "month"
     * transactions: all transactions in [startDate, endDate] (existing queries already filtered)
     */
    private List<TimeSeriesPoint> buildTimeSeries(LocalDate startDate, LocalDate endDate, String aggregate, List<Transaction> transactions) {
        if (transactions == null) transactions = Collections.emptyList();

        // map transaction date -> revenue & count (only USD for revenue)
        Map<LocalDate, BucketAggregate> byDate = new HashMap<>();
        for (Transaction t : transactions) {
            if (t == null || t.getCreatedAt() == null) continue;
            LocalDate d = t.getCreatedAt().toLocalDate();
            BucketAggregate b = byDate.getOrDefault(d, new BucketAggregate(BigDecimal.ZERO, 0L));
            if (t.getAmount() != null && "USD".equalsIgnoreCase(t.getCurrency())) {
                b.revenue = b.revenue.add(t.getAmount());
            }
            b.count += 1;
            byDate.put(d, b);
        }

        List<BucketRange> buckets = new ArrayList<>();

        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1; // inclusive

        if ("day".equalsIgnoreCase(aggregate)) {
            // each day
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate)) {
                buckets.add(new BucketRange(cur, cur.plusDays(1)));
                cur = cur.plusDays(1);
            }
        } else if ("week".equalsIgnoreCase(aggregate)) {
            // split into 4 roughly-even weeks (suitable for a month view)
            long chunk = Math.max(1, (long) Math.ceil(days / 4.0));
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate)) {
                LocalDate next = cur.plusDays(chunk);
                if (next.isAfter(endDate.plusDays(1))) next = endDate.plusDays(1);
                buckets.add(new BucketRange(cur, next));
                cur = next;
            }
            // ensure max 4 buckets (if month shorter) -- this will naturally produce <=4
        } else if ("month".equalsIgnoreCase(aggregate)) {
            // group by month (suitable for year view)
            LocalDate cur = LocalDate.of(startDate.getYear(), startDate.getMonth(), 1);
            LocalDate finalMonth = LocalDate.of(endDate.getYear(), endDate.getMonth(), 1);
            while (!cur.isAfter(finalMonth)) {
                LocalDate bucketStart = cur;
                LocalDate bucketEnd = cur.plusMonths(1);
                buckets.add(new BucketRange(bucketStart, bucketEnd));
                cur = cur.plusMonths(1);
            }
        } else {
            // fallback => daily
            LocalDate cur = startDate;
            while (!cur.isAfter(endDate)) {
                buckets.add(new BucketRange(cur, cur.plusDays(1)));
                cur = cur.plusDays(1);
            }
        }

        // aggregate per bucket
        List<TimeSeriesPoint> series = new ArrayList<>();
        int idx = 1;
        for (BucketRange b : buckets) {
            BigDecimal sum = BigDecimal.ZERO;
            long cnt = 0;
            // sum all dates inside bucket
            LocalDate d = b.start;
            while (d.isBefore(b.end)) {
                BucketAggregate ag = byDate.get(d);
                if (ag != null) {
                    sum = sum.add(ag.revenue);
                    cnt += ag.count;
                }
                d = d.plusDays(1);
            }
            String label;
            if ("day".equalsIgnoreCase(aggregate)) {
                label = String.format("%02d/%02d", b.start.getDayOfMonth(), b.start.getMonthValue());
            } else if ("week".equalsIgnoreCase(aggregate)) {
                label = "Week " + idx++;
            } else { // month
                label = b.start.getMonth().name().substring(0,3); // Jan, Feb...
            }
            series.add(new TimeSeriesPoint(label, sum, cnt));
        }

        return series;
    }

    // helper classes
    private static class BucketAggregate {
        BigDecimal revenue;
        long count;
        BucketAggregate(BigDecimal r, long c) { this.revenue = r; this.count = c; }
    }
    private static class BucketRange {
        LocalDate start;
        LocalDate end; // exclusive
        BucketRange(LocalDate s, LocalDate e) { this.start = s; this.end = e; }
    }


    // trong StatisticsServiceImpl
    @Override
    public StatisticsResponse getUserStatistics(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // 1. Transactions
        List<Transaction> transactions = transactionRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
        BigDecimal totalAmount = transactions.stream()
                .filter(t -> t != null && t.getAmount() != null)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalTransactions = transactions.size();

        // 2. Learning activities
        List<UserLearningActivity> activities = userLearningActivityRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
        Map<String, Long> activityBreakdown = activities.stream()
                .collect(Collectors.groupingBy(a -> a.getActivityType().name(), Collectors.counting()));

        int lessonsCompleted = activityBreakdown.getOrDefault(ActivityType.LESSON_COMPLETION.toString(), 0L).intValue();
        int quizzesCompleted = activityBreakdown.getOrDefault(ActivityType.QUIZ_COMPLETE.toString(), 0L).intValue();
        int groupSessions = activityBreakdown.getOrDefault(ActivityType.GROUP_SESSION_JOINED.toString(), 0L).intValue();
        int examsTaken = activityBreakdown.getOrDefault(ActivityType.EXAM.toString(), 0L).intValue();

        // 3. Courses enrolled
        List<CourseEnrollment> enrollments = courseEnrollmentRepository.findByUserIdAndEnrolledAtBetween(userId, start, end);
        int coursesEnrolled = enrollments.size();

        // other metrics...
        List<UserDailyChallenge> challenges = userDailyChallengeRepository.findByUser_UserIdAndCreatedAtBetween(userId, start, end);
        int challengesCompleted = (int) challenges.stream().filter(UserDailyChallenge::isCompleted).count();
        List<UserEvent> events = userEventRepository.findById_UserIdAndParticipatedAtBetween(userId, start, end);
        int eventsParticipated = events.size();
        List<VideoCallParticipant> calls = videoCallParticipantRepository.findByUser_UserIdAndJoinedAtBetween(userId, start, end);
        int callsJoined = calls.size();

        // Build response object
        StatisticsResponse response = new StatisticsResponse();
        response.setTotalLessonsCompleted(lessonsCompleted);
        response.setTotalCoursesEnrolled(coursesEnrolled);
        response.setTotalQuizzesCompleted(quizzesCompleted);
        response.setTotalGroupSessionsJoined(groupSessions);
        response.setTotalExamsTaken(examsTaken);
        response.setTotalDailyChallengesCompleted(challengesCompleted);
        response.setTotalEventsParticipated(eventsParticipated);
        response.setTotalVideoCallsJoined(callsJoined);
        response.setTotalTransactionAmount(totalAmount);
        response.setTotalTransactions(totalTransactions);
        response.setActivityBreakdown(activityBreakdown);

        // Build timeSeries for this user (prefer transactions for revenue/transactions chart)
        List<TimeSeriesPoint> ts = buildTimeSeries(startDate, endDate,
                (aggregate == null ? "day" : aggregate),
                transactions);
        response.setTimeSeries(ts);

        return response;
    }


    @Override
    public List<UserCountResponse> getUserCounts(String period, LocalDate startDate, LocalDate endDate) {
        List<User> users = userRepository.findByCreatedAtBetween(
                startDate.atStartOfDay().atOffset(ZoneOffset.UTC),
                endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC)
        );
        return aggregateUserCounts(users, period);
    }

    @Override
    public List<UserCountResponse> getUserGrowth(String period, LocalDate startDate, LocalDate endDate) {
        List<User> users = userRepository.findByCreatedAtBetween(
                startDate.atStartOfDay().atOffset(ZoneOffset.UTC),
                endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC)
        );
        List<UserCountResponse> counts = aggregateUserCounts(users, period);
        return calculateGrowth(counts);
    }

    @Override
    public List<ActivityCountResponse> getActivityStatistics(String activityType, LocalDate startDate, LocalDate endDate, String period) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<UserLearningActivity> activities = activityRepository.findByCreatedAtBetween(start, end);

        if (activityType != null) {
            activities = activities.stream()
                    .filter(a -> a.getActivityType().name().equalsIgnoreCase(activityType))
                    .collect(Collectors.toList());
        }
        String p = (period == null ? "day" : period);
        return aggregateActivities(activities, p);
    }

    // note: added 'period' parameter to use correct formatter/grouping
    @Override
    public List<TransactionStatsResponse> getTransactionStatistics(String status, String provider, LocalDate startDate, LocalDate endDate, String period) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<Transaction> transactions = transactionRepository.findByCreatedAtBetween(start, end);

        if (status != null) {
            transactions = transactions.stream()
                    .filter(t -> t.getStatus() != null && t.getStatus().name().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }
        if (provider != null) {
            transactions = transactions.stream()
                    .filter(t -> t.getProvider() != null && t.getProvider().name().equalsIgnoreCase(provider))
                    .collect(Collectors.toList());
        }
        String p = (period == null ? "day" : period);
        return aggregateTransactions(transactions, p);
    }

    private List<UserCountResponse> aggregateUserCounts(List<User> users, String period) {
        DateTimeFormatter formatter = getFormatter(period);
        Map<String, Long> newUsersMap = users.stream()
                .collect(Collectors.groupingBy(u -> u.getCreatedAt().toLocalDate().format(formatter), Collectors.counting()));

        List<UserCountResponse> responses = new ArrayList<>();
        newUsersMap.forEach((p, c) -> {
            UserCountResponse resp = new UserCountResponse();
            resp.setPeriod(p);
            resp.setNewUsers(c);
            resp.setTotalUsers(0); // Placeholder
            responses.add(resp);
        });

        responses.sort(Comparator.comparing(UserCountResponse::getPeriod));
        return responses;
    }

    private List<UserCountResponse> calculateGrowth(List<UserCountResponse> counts) {
        for (int i = 1; i < counts.size(); i++) {
            long prev = counts.get(i - 1).getNewUsers();
            long curr = counts.get(i).getNewUsers();
            counts.get(i).setNewUsers(curr - prev);
            if (prev == 0) {
                counts.get(i).setTotalUsers(0);
            } else {
                counts.get(i).setTotalUsers(Math.round((curr - prev) * 100.0 / prev));
            }
        }
        return counts;
    }

    private List<ActivityCountResponse> aggregateActivities(List<UserLearningActivity> activities, String period) {
        DateTimeFormatter formatter = getFormatter(period);
        Map<String, Map<String, Long>> map = activities.stream()
                .collect(Collectors.groupingBy(a -> a.getCreatedAt().toLocalDate().format(formatter),
                        Collectors.groupingBy(a -> a.getActivityType().name(), Collectors.counting())));

        List<ActivityCountResponse> responses = new ArrayList<>();
        map.forEach((p, typeMap) -> typeMap.forEach((t, c) -> {
            ActivityCountResponse resp = new ActivityCountResponse();
            resp.setPeriod(p);
            resp.setActivityType(t);
            resp.setCount(c);
            responses.add(resp);
        }));

        responses.sort(Comparator.comparing(ActivityCountResponse::getPeriod));
        return responses;
    }

    private List<TransactionStatsResponse> aggregateTransactions(List<Transaction> transactions, String period) {
        DateTimeFormatter formatter = getFormatter(period);

        Map<String, Map<String, Map<String, TxnAggregate>>> map = transactions.stream()
                .collect(Collectors.groupingBy(t -> t.getCreatedAt().toLocalDate().format(formatter),
                        Collectors.groupingBy(t -> t.getStatus().name(),
                                Collectors.groupingBy(t -> t.getProvider().name(),
                                        Collectors.reducing(
                                                new TxnAggregate(0L, BigDecimal.ZERO),
                                                tx -> new TxnAggregate(1L, tx.getAmount() == null ? BigDecimal.ZERO : tx.getAmount()),
                                                (a1, a2) -> new TxnAggregate(
                                                        a1.getCount() + a2.getCount(),
                                                        a1.getTotal().add(a2.getTotal())
                                                )
                                        )
                                ))));

        List<TransactionStatsResponse> responses = new ArrayList<>();
        map.forEach((p, statusMap) ->
                statusMap.forEach((s, provMap) ->
                        provMap.forEach((pr, agg) -> {
                            TransactionStatsResponse resp = new TransactionStatsResponse();
                            resp.setPeriod(p);
                            resp.setStatus(s);
                            resp.setProvider(pr);
                            resp.setCount(agg.getCount());
                            resp.setTotalAmount(agg.getTotal());
                            responses.add(resp);
                        })
                )
        );

        responses.sort(Comparator.comparing(TransactionStatsResponse::getPeriod));
        return responses;
    }

    private DateTimeFormatter getFormatter(String period) {
        return switch (period) {
            case "month" -> DateTimeFormatter.ofPattern("yyyy-MM");
            case "year" -> DateTimeFormatter.ofPattern("yyyy");
            default -> DateTimeFormatter.ofPattern("yyyy-MM-dd");
        };
    }

    // ---------------------------
    // TEACHER methods
    // ---------------------------

    @Override
    public TeacherOverviewResponse getTeacherOverview(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate) {
        // if teacherId null -> caller's identity should be used (controller will pass it); for now assume provided
        if (teacherId == null) throw new IllegalArgumentException("teacherId is required");

        // find courses by this teacher (creatorId)
        List<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(teacherId);
        if (courses == null) courses = Collections.emptyList();

        int totalCourses = courses.size();

        // lessons count
        int totalLessons = 0;
        List<UUID> courseIds = courses.stream().map(Course::getCourseId).collect(Collectors.toList());
        if (!courseIds.isEmpty()) {
            List<Lesson> lessons = lessonRepository.findByCourseIdIn(courseIds);
            totalLessons = lessons == null ? 0 : lessons.size();
        }

        // students: distinct users enrolled in these courses in range
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        long totalStudents = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalTransactions = 0;

        if (!courseIds.isEmpty()) {
            // enrollments
            List<CourseEnrollment> enrollments = courseEnrollmentRepository.findByCourseIdInAndEnrolledAtBetween(courseIds, start, end);
            totalStudents = enrollments == null ? 0L : enrollments.stream().map(CourseEnrollment::getUserId).distinct().count();

            // transactions: try to sum transactions referencing courseId; fallback sum by enrolled users' transactions
            List<Transaction> txs = transactionRepository.findByCreatedAtBetween(start, end);
            // filter txs where tx.courseId in courseIds OR tx.userId in enrolled users
            Set<UUID> enrolledUsers = enrollments == null ? Collections.emptySet() : enrollments.stream().map(CourseEnrollment::getUserId).collect(Collectors.toSet());

            List<Transaction> relevant = txs.stream().filter(t -> {
                try {
                    // check course id on transaction if exists
                    Object txCourse = null;
                    try {
                        txCourse = t.getClass().getMethod("getCourseId").invoke(t);
                    } catch (NoSuchMethodException ignored) { }
                    if (txCourse instanceof UUID && courseIds.contains(txCourse)) return true;
                } catch (Exception ignored) { }
                // fallback check user id
                return t.getUserId() != null && enrolledUsers.contains(t.getUserId());
            }).toList();

            totalTransactions = relevant.size();
            totalRevenue = relevant.stream()
                    .filter(tx -> tx != null && tx.getAmount() != null && "USD".equalsIgnoreCase(tx.getCurrency()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // build overall timeSeries across teacher's courses
        List<Transaction> txForSeries = new ArrayList<>();
        if (!courseIds.isEmpty()) {
            // we can reuse transactions filtered above across whole date range
            OffsetDateTime fullStart = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime fullEnd = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
            List<Transaction> txsAll = transactionRepository.findByCreatedAtBetween(fullStart, fullEnd);
            if (txsAll != null) {
                Set<UUID> courseIdSet = new HashSet<>(courseIds);
                Set<UUID> enrolledUsersSet = courseEnrollmentRepository.findByCourseIdIn(courseIds).stream()
                        .map(CourseEnrollment::getUserId).collect(Collectors.toSet());
                txForSeries = txsAll.stream().filter(t -> {
                    try {
                        Object txCourse = null;
                        try {
                            txCourse = t.getClass().getMethod("getCourseId").invoke(t);
                        } catch (NoSuchMethodException ignored) { }
                        if (txCourse instanceof UUID && courseIdSet.contains(txCourse)) return true;
                    } catch (Exception ignored) { }
                    return t.getUserId() != null && enrolledUsersSet.contains(t.getUserId());
                }).collect(Collectors.toList());
            }
        }

        List<TimeSeriesPoint> series = buildTimeSeries(startDate, endDate, aggregate, txForSeries);

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
    public List<CoursePerformanceResponse> getTeacherCoursesPerformance(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate) {
        if (teacherId == null) throw new IllegalArgumentException("teacherId is required");

        List<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(teacherId);
        if (courses == null) courses = Collections.emptyList();

        List<CoursePerformanceResponse> out = new ArrayList<>();
        for (Course c : courses) {
            CoursePerformanceResponse cp = new CoursePerformanceResponse();
            cp.setCourseId(c.getCourseId());
            cp.setTitle(c.getTitle());

            // lessons count
            List<Lesson> lessons = lessonRepository.findByCourseIdAndIsDeletedFalse(c.getCourseId());
            cp.setLessonsCount(lessons == null ? 0 : lessons.size());

            // students
            OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
            List<CourseEnrollment> enrolls = courseEnrollmentRepository.findByCourseIdAndEnrolledAtBetween(c.getCourseId(), start, end);
            cp.setStudentsCount(enrolls == null ? 0L : enrolls.stream().map(CourseEnrollment::getUserId).distinct().count());

            // transactions & revenue
            List<Transaction> txs = transactionRepository.findByCreatedAtBetween(start, end);
            List<Transaction> relevant = txs.stream().filter(t -> {
                try {
                    Object txCourse = null;
                    try {
                        txCourse = t.getClass().getMethod("getCourseId").invoke(t);
                    } catch (NoSuchMethodException ignored) { }
                    if (txCourse instanceof UUID && c.getCourseId().equals(txCourse)) return true;
                } catch (Exception ignored) { }
                return t.getUserId() != null && enrolls != null && enrolls.stream()
                        .anyMatch(e -> e.getUserId()
                                .equals(t.getUserId()));
            }).collect(Collectors.toList());

            BigDecimal totalRev = relevant.stream()
                    .filter(r -> r != null && r.getAmount() != null && "USD".equalsIgnoreCase(r.getCurrency()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            cp.setRevenue(totalRev);
            cp.setTransactions(relevant.size());

            // timeseries for this course
            List<TimeSeriesPoint> ts = buildTimeSeries(startDate, endDate, aggregate, relevant);
            cp.setTimeSeries(ts);

            out.add(cp);
        }

        return out;
    }

    @Override
    public List<LessonStatsResponse> getTeacherCourseLessonStats(UUID teacherId, UUID courseId, LocalDate startDate, LocalDate endDate) {
        // ensure teacher owns course
        Optional<Course> opt = courseRepository.findByCourseIdAndIsDeletedFalse(courseId);
        if (opt.isEmpty()) throw new IllegalArgumentException("Course not found");
        Course course = opt.get();
        if (!course.getCreatorId().equals(teacherId)) throw new SecurityException("Not course owner");

        // get lessons
        List<Lesson> lessons = lessonRepository.findByCourseIdAndIsDeletedFalse(courseId);
        if (lessons == null) lessons = Collections.emptyList();

        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<LessonStatsResponse> out = new ArrayList<>();
        for (Lesson l : lessons) {
            LessonStatsResponse r = new LessonStatsResponse();
            r.setLessonId(l.getLessonId());
            r.setLessonName(l.getLessonName());
            r.setExpReward(l.getExpReward());
            // completions in activities
            List<UserLearningActivity> acts = userLearningActivityRepository.findLessonActivities(
                    l.getLessonId(),
                    List.of(ActivityType.LESSON_COMPLETE, ActivityType.LESSON_COMPLETION),
                    start,
                    end
            );
            long completions = acts == null ? 0L : acts.stream()
                    .filter(a -> a.getActivityType() != null && a.getActivityType().name().equalsIgnoreCase(ActivityType.LESSON_COMPLETION.toString()))
                    .count();
            r.setCompletions(completions);
            out.add(r);
        }
        return out;
    }

    @Override
    public List<TimeSeriesPoint> getTeacherCourseRevenue(UUID teacherId, UUID courseId, LocalDate startDate, LocalDate endDate, String aggregate) {
        Optional<Course> opt = courseRepository.findByCourseIdAndIsDeletedFalse(courseId);
        if (opt.isEmpty()) throw new IllegalArgumentException("Course not found");
        Course course = opt.get();
        if (!course.getCreatorId().equals(teacherId)) throw new SecurityException("Not course owner");

        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<Transaction> txs = transactionRepository.findByCreatedAtBetween(start, end);
        List<Transaction> relevant = txs.stream().filter(t -> {
            try {
                Object txCourse = null;
                try {
                    txCourse = t.getClass().getMethod("getCourseId").invoke(t);
                } catch (NoSuchMethodException ignored) { }
                if (txCourse instanceof UUID && courseId.equals(txCourse)) return true;
            } catch (Exception ignored) { }
            // fallback by user enrollments
            return courseEnrollmentRepository.findByCourseIdAndIsDeletedFalse(courseId).stream().map(CourseEnrollment::getUserId).anyMatch(u-> u.equals(t.getUserId()));
        }).collect(Collectors.toList());

        return buildTimeSeries(startDate, endDate, aggregate, relevant);
    }

}
