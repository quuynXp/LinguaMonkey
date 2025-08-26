package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardEntryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface LeaderboardEntryService {
    Page<LeaderboardEntryResponse> getAllLeaderboardEntries(String leaderboardId, String userId, Pageable pageable);
    LeaderboardEntryResponse getLeaderboardEntryByIds(UUID leaderboardId, UUID userId);
    LeaderboardEntryResponse createLeaderboardEntry(LeaderboardEntryRequest request);
    LeaderboardEntryResponse updateLeaderboardEntry(UUID leaderboardId, UUID userId, LeaderboardEntryRequest request);
    void deleteLeaderboardEntry(UUID leaderboardId, UUID userId);
    List<LeaderboardEntryResponse> getTop3LeaderboardEntries(UUID leaderboardId);
    List<LeaderboardEntryResponse> getTop3GlobalLeaderboardEntries();
}