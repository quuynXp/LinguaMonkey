package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

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

    // Thread-safe map for queue
    private final Map<UUID, QueueItem> waitingUsers = new ConcurrentHashMap<>();

    private static final int INITIAL_CRITERIA_COUNT = 5;
    private static final int REDUCTION_INTERVAL_SECONDS = 30;
    private static final int IMMEDIATE_MATCH_THRESHOLD = 3;
    private static final int MIN_CRITERIA = 1;

    public void addToQueue(UUID userId, CallPreferencesRequest prefs) {
        // Only add if not exists, to preserve joinedAt time for logic
        waitingUsers.computeIfAbsent(userId, k -> new QueueItem(userId, prefs, Instant.now()));
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
        int reduction = (int) (seconds / REDUCTION_INTERVAL_SECONDS);
        int threshold = INITIAL_CRITERIA_COUNT - reduction;
        return Math.max(threshold, MIN_CRITERIA);
    }

    /**
     * Finds a match for the requesting user using the time-decay logic.
     * Criteria:
     * 1. Learning Lang A == Native Lang B
     * 2. Native Lang A == Learning Lang B
     * 3. Gender (Any match or Exact match)
     * 4. Age Range
     * 5. Interests (Overlap > 0)
     */
    public MatchResult findMatch(UUID currentUserId) {
        QueueItem currentUser = waitingUsers.get(currentUserId);
        if (currentUser == null) return null;

        int currentThreshold = getCurrentCriteriaThreshold(currentUserId);

        // Iterate through all other users in queue
        for (QueueItem potentialPartner : waitingUsers.values()) {
            if (potentialPartner.getUserId().equals(currentUserId)) continue;

            int score = calculateCompatibilityScore(currentUser.getPreferences(), potentialPartner.getPreferences());

            // 1. Immediate match rule: If score > 3, match instantly regardless of wait time
            if (score >= IMMEDIATE_MATCH_THRESHOLD) {
                return new MatchResult(potentialPartner.getUserId(), score);
            }

            // 2. Time-based rule: If score meets the current relaxed threshold
            if (score >= currentThreshold) {
                return new MatchResult(potentialPartner.getUserId(), score);
            }
        }

        return null;
    }

    private int calculateCompatibilityScore(CallPreferencesRequest p1, CallPreferencesRequest p2) {
        int score = 0;

        // Criterion 1: Reciprocal Language Learning (Primary Goal)
        // Does P1 teach what P2 wants to learn?
        if (safeEquals(p1.getNativeLanguage(), p2.getLearningLanguage())) {
            score++;
        }
        
        // Criterion 2: Reciprocal Language Learning (Secondary Goal)
        // Does P2 teach what P1 wants to learn?
        if (safeEquals(p1.getLearningLanguage(), p2.getNativeLanguage())) {
            score++;
        }

        // Criterion 3: Gender Preference
        // "any" matches anything. Specific must match specific.
        if (isGenderCompatible(p1.getGender(), p2.getGender())) {
            score++;
        }

        // Criterion 4: Age Range
        if (safeEquals(p1.getAgeRange(), p2.getAgeRange())) {
            score++;
        }

        // Criterion 5: Shared Interests
        if (!Collections.disjoint(p1.getInterests(), p2.getInterests())) {
            score++;
        }

        return score;
    }

    private boolean safeEquals(String s1, String s2) {
        return s1 != null && s2 != null && s1.equalsIgnoreCase(s2);
    }

    private boolean isGenderCompatible(String g1, String g2) {
        if (g1 == null || g2 == null) return true; // Default to loose if missing
        if ("any".equalsIgnoreCase(g1) || "any".equalsIgnoreCase(g2)) return true;
        return g1.equalsIgnoreCase(g2);
    }
}