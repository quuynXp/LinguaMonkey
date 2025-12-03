package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class MatchmakingQueueService {

    @Data
    @AllArgsConstructor
    private static class QueueItem {
        private UUID userId;
        private CallPreferencesRequest preferences;
        private Instant joinedAt;
    }

    @Data
    @AllArgsConstructor
    public static class MatchResult {
        private UUID partnerId;
        private int score;
    }

    private final Map<UUID, QueueItem> waitingUsers = new ConcurrentHashMap<>();

    // Scoring Weights
    private static final int SCORE_LANGUAGE_EXCHANGE = 50; // Critical priority
    private static final int SCORE_INTERESTS = 10;
    private static final int SCORE_PROFICIENCY = 5;
    private static final int SCORE_DEMOGRAPHICS = 5;

    // Thresholds
    private static final int INITIAL_THRESHOLD = 60; // Starts high (needs language match + strictness)
    private static final int MIN_THRESHOLD = 5;      // Eventually matches anyone
    private static final int REDUCTION_INTERVAL_SECONDS = 15;
    private static final int REDUCTION_STEP = 10;

    public void addToQueue(UUID userId, CallPreferencesRequest prefs) {
        waitingUsers.computeIfAbsent(userId, k -> new QueueItem(userId, prefs, Instant.now()));
        if (waitingUsers.containsKey(userId)) {
            waitingUsers.get(userId).setPreferences(prefs);
        }
    }

    public void removeFromQueue(UUID userId) {
        waitingUsers.remove(userId);
    }

    public int getQueueSize() {
        return waitingUsers.size();
    }

    public long getSecondsWaited(UUID userId) {
        QueueItem item = waitingUsers.get(userId);
        if (item == null) return 0;
        return Duration.between(item.getJoinedAt(), Instant.now()).getSeconds();
    }

    public int getCurrentCriteriaThreshold(UUID userId) {
        long seconds = getSecondsWaited(userId);
        int reduction = (int) (seconds / REDUCTION_INTERVAL_SECONDS) * REDUCTION_STEP;
        return Math.max(INITIAL_THRESHOLD - reduction, MIN_THRESHOLD);
    }

    public MatchResult findMatch(UUID currentUserId) {
        QueueItem currentUser = waitingUsers.get(currentUserId);
        if (currentUser == null) return null;

        int currentThreshold = getCurrentCriteriaThreshold(currentUserId);

        // Smart Matching Algorithm:
        // 1. Calculate score for all candidates
        // 2. Filter by threshold
        // 3. Sort by Score DESC, then WaitTime DESC (Longest waiter gets priority if scores equal)
        Optional<MatchResult> bestMatch = waitingUsers.values().stream()
                .filter(candidate -> !candidate.getUserId().equals(currentUserId))
                .map(candidate -> {
                    int score = calculateCompatibilityScore(currentUser.getPreferences(), candidate.getPreferences());
                    return new MatchResult(candidate.getUserId(), score);
                })
                .filter(result -> result.getScore() >= currentThreshold)
                .sorted((r1, r2) -> {
                    // Compare Scores
                    int scoreCompare = Integer.compare(r2.getScore(), r1.getScore());
                    if (scoreCompare != 0) return scoreCompare;
                    
                    // Tie-breaker: Prioritize the user who has been waiting longer
                    long wait1 = getSecondsWaited(r1.getPartnerId());
                    long wait2 = getSecondsWaited(r2.getPartnerId());
                    return Long.compare(wait2, wait1);
                })
                .findFirst();

        return bestMatch.orElse(null);
    }

    private int calculateCompatibilityScore(CallPreferencesRequest p1, CallPreferencesRequest p2) {
        int score = 0;

        // 1. Critical: Language Exchange (Bi-directional)
        boolean p1CanTeachP2 = safeList(p2.getLearningLanguages()).contains(safeString(p1.getNativeLanguage()));
        boolean p2CanTeachP1 = safeList(p1.getLearningLanguages()).contains(safeString(p2.getNativeLanguage()));

        if (p1CanTeachP2 && p2CanTeachP1) {
            score += SCORE_LANGUAGE_EXCHANGE; // +50
        } else if (p1CanTeachP2 || p2CanTeachP1) {
            score += (SCORE_LANGUAGE_EXCHANGE / 2); // +25 (Partial match)
        }

        // 2. Interests (Overlap)
        List<String> sharedInterests = new ArrayList<>(safeList(p1.getInterests()));
        sharedInterests.retainAll(safeList(p2.getInterests()));
        score += (sharedInterests.size() * SCORE_INTERESTS); 

        // 3. Proficiency
        if (safeEquals(p1.getProficiency(), p2.getProficiency())) {
            score += SCORE_PROFICIENCY;
        }

        // 4. Learning Pace
        if (safeEquals(p1.getLearningPace(), p2.getLearningPace())) {
            score += SCORE_PROFICIENCY;
        }

        // 5. Demographics (Gender & Age)
        if (isGenderCompatible(p1.getGender(), p2.getGender())) {
            score += SCORE_DEMOGRAPHICS;
        }
        if (safeEquals(p1.getAgeRange(), p2.getAgeRange())) {
            score += SCORE_DEMOGRAPHICS;
        }

        return score;
    }

    private boolean safeEquals(String s1, String s2) {
        return s1 != null && s2 != null && s1.equalsIgnoreCase(s2);
    }

    private String safeString(String s) {
        return s == null ? "" : s;
    }

    private List<String> safeList(List<String> list) {
        return list == null ? Collections.emptyList() : list;
    }

    private boolean isGenderCompatible(String req, String target) {
        if (req == null || target == null) return true;
        if ("any".equalsIgnoreCase(req) || "any".equalsIgnoreCase(target)) return true;
        return req.equalsIgnoreCase(target);
    }
}