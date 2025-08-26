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


    @Override
    public StatisticsOverviewResponse getOverview(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate) {
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // --- existing totals (reuse your current logic) ---
        List<User> usersInRange = userRepository.findByCreatedAtBetween(start, end);
        long totalUsers = usersInRange == null ? 0L : usersInRange.size();

        int totalCourses;
        if (userId != null) {
            List<?> enrollments = courseEnrollmentRepository.findByUserIdAndEnrolledAtBetween(userId, start, end);
            totalCourses = enrollments == null ? 0 : enrollments.size();
        } else {
            List<?> enrollments = courseEnrollmentRepository.findByEnrolledAtBetween(start, end);
            totalCourses = enrollments == null ? 0 : enrollments.size();
        }

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


    @Override
    public StatisticsResponse getUserStatistics(UUID userId, LocalDate startDate, LocalDate endDate) {
        // assume controller already ensured startDate/endDate not null and start <= end
        OffsetDateTime start = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // 1. Transactions
        List<Transaction> transactions = transactionRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
        BigDecimal totalAmount = transactions.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalTransactions = transactions.size();

        // 2. Learning activities
        List<UserLearningActivity> activities = userLearningActivityRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
        Map<String, Long> activityBreakdown = activities.stream()
                .collect(Collectors.groupingBy(a -> a.getActivityType().name(), Collectors.counting()));

        int lessonsCompleted = activityBreakdown.getOrDefault("LESSON_COMPLETE", 0L).intValue();
        int quizzesCompleted = activityBreakdown.getOrDefault("QUIZ_COMPLETE", 0L).intValue();
        int groupSessions = activityBreakdown.getOrDefault("GROUP_SESSION_JOINED", 0L).intValue();
        int examsTaken = activityBreakdown.getOrDefault("EXAM", 0L).intValue();

        // 3. Courses enrolled
        List<CourseEnrollment> enrollments = courseEnrollmentRepository.findByUserIdAndEnrolledAtBetween(userId, start, end);
        int coursesEnrolled = enrollments.size();

        // 4. Daily challenges
        List<UserDailyChallenge> challenges = userDailyChallengeRepository.findByUser_UserIdAndCreatedAtBetween(userId, start, end);
        int challengesCompleted = (int) challenges.stream().filter(UserDailyChallenge::isCompleted).count();

        // 5. Events
        List<UserEvent> events = userEventRepository.findById_UserIdAndParticipatedAtBetween(userId, start, end);
        int eventsParticipated = events.size();

        // 6. Video calls
        List<VideoCallParticipant> calls = videoCallParticipantRepository.findByUser_UserIdAndJoinedAtBetween(userId, start, end);
        int callsJoined = calls.size();

        // Build response
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
}
