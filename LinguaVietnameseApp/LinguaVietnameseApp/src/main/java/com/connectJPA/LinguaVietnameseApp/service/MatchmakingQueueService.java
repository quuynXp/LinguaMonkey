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
        private UUID roomId;
        private String roomName;
    }

    private final Map<UUID, QueueItem> waitingUsers = new ConcurrentHashMap<>();
    private final Map<UUID, MatchResult> pendingMatches = new ConcurrentHashMap<>();

    private static final int SCORE_LANGUAGE_EXCHANGE = 50;
    private static final int SCORE_INTERESTS = 15;
    private static final int SCORE_PROFICIENCY = 15;
    private static final int SCORE_DEMOGRAPHICS = 15;

    private static final int INITIAL_THRESHOLD = 30;
    private static final int MIN_THRESHOLD = 1;
    private static final int REDUCTION_INTERVAL_SECONDS = 15;
    private static final int REDUCTION_STEP = 10;

    public void addToQueue(UUID userId, CallPreferencesRequest prefs) {
        // Clear any stale pending matches when re-joining queue
        pendingMatches.remove(userId);
        waitingUsers.compute(userId, (k, v) -> new QueueItem(userId, prefs, Instant.now()));
    }

    public void removeFromQueue(UUID userId) {
        waitingUsers.remove(userId);
        pendingMatches.remove(userId);
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

    public MatchResult checkPendingMatch(UUID userId) {
        return pendingMatches.remove(userId);
    }

    public void notifyPartner(UUID partnerId, MatchResult result) {
        // Utility method to manually set a match if needed
        pendingMatches.put(partnerId, result);
        waitingUsers.remove(partnerId);
    }

    /**
     * Core atomic matching logic.
     * 1. Checks if current user was already matched by someone else (Passive).
     * 2. Tries to find and atomically claim a partner (Active).
     */
    public MatchResult findMatch(UUID currentUserId) {
        MatchResult passiveMatch = pendingMatches.remove(currentUserId);
        if (passiveMatch != null) {
            waitingUsers.remove(currentUserId); // Ensure we are out of queue
            return passiveMatch;
        }

        QueueItem currentUser = waitingUsers.get(currentUserId);
        if (currentUser == null) return null;

        int currentThreshold = getCurrentCriteriaThreshold(currentUserId);

        Optional<QueueItem> bestMatch = waitingUsers.values().stream()
                .filter(candidate -> !candidate.getUserId().equals(currentUserId))
                .map(candidate -> {
                    int score = calculateCompatibilityScore(currentUser.getPreferences(), candidate.getPreferences());
                    return new AbstractMap.SimpleEntry<>(candidate, score);
                })
                .filter(entry -> entry.getValue() >= currentThreshold)
                .sorted((e1, e2) -> {
                    int scoreCompare = Integer.compare(e2.getValue(), e1.getValue());
                    if (scoreCompare != 0) return scoreCompare;
                    
                    long wait1 = getSecondsWaited(e1.getKey().getUserId());
                    long wait2 = getSecondsWaited(e2.getKey().getUserId());
                    return Long.compare(wait2, wait1);
                })
                .map(AbstractMap.SimpleEntry::getKey)
                .findFirst();

        if (bestMatch.isPresent()) {
            QueueItem partner = bestMatch.get();
            UUID partnerId = partner.getUserId();

            if (waitingUsers.remove(partnerId) != null) {
                waitingUsers.remove(currentUserId);

                UUID roomId = UUID.randomUUID();
                String roomName = "Room-" + roomId.toString().substring(0, 8);
                int score = calculateCompatibilityScore(currentUser.getPreferences(), partner.getPreferences());

                MatchResult partnerResult = new MatchResult(currentUserId, score, roomId, roomName);
                pendingMatches.put(partnerId, partnerResult);

                return new MatchResult(partnerId, score, roomId, roomName);
            }
        }

        return null;
    }

    private int calculateCompatibilityScore(CallPreferencesRequest p1, CallPreferencesRequest p2) {
        int score = 0;

        boolean p1CanTeachP2 = safeList(p2.getLearningLanguages()).contains(safeString(p1.getNativeLanguage()));
        boolean p2CanTeachP1 = safeList(p1.getLearningLanguages()).contains(safeString(p2.getNativeLanguage()));

        if (p1CanTeachP2 && p2CanTeachP1) {
            score += SCORE_LANGUAGE_EXCHANGE;
        } else if (p1CanTeachP2 || p2CanTeachP1) {
            score += (SCORE_LANGUAGE_EXCHANGE / 2);
        }

        List<String> sharedInterests = new ArrayList<>(safeList(p1.getInterests()));
        sharedInterests.retainAll(safeList(p2.getInterests()));
        score += (sharedInterests.size() * SCORE_INTERESTS);

        if (safeEquals(p1.getProficiency(), p2.getProficiency())) {
            score += SCORE_PROFICIENCY;
        }

        if (safeEquals(p1.getLearningPace(), p2.getLearningPace())) {
            score += SCORE_PROFICIENCY;
        }

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