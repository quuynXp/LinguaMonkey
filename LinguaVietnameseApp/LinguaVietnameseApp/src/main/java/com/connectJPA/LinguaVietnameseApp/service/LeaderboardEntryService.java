package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardEntryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface LeaderboardEntryService {

    Page<LeaderboardEntryResponse> getAllLeaderboardEntries(String leaderboardId, Pageable pageable);

    LeaderboardEntry ensureEntryExists(UUID userId, UUID leaderboardId);

    LeaderboardEntryResponse getLeaderboardEntryByIds(UUID leaderboardId, Pageable pageable);

    LeaderboardEntryResponse createLeaderboardEntry(LeaderboardEntryRequest request);

    LeaderboardEntryResponse updateLeaderboardEntry(UUID leaderboardId, UUID userId, LeaderboardEntryRequest request);

    void deleteLeaderboardEntry(UUID leaderboardId, UUID userId);

    List<LeaderboardEntryResponse> getTop3LeaderboardEntries(UUID leaderboardId);

    List<LeaderboardEntryResponse> getTop3GlobalLeaderboardEntries();

    LeaderboardEntryResponse getCurrentUserEntryWithRank(UUID leaderboardId, UUID userId);
    
    void updateScore(UUID leaderboardId, UUID userId, double score);
    
    Integer getRankForUserByTab(String tab, String type, UUID userId);
}