package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

import java.util.UUID;

public interface LeaderboardService {
    Page<LeaderboardResponse> getAllLeaderboards(String tab, Pageable pageable);

    List<LeaderboardEntryResponse> getGlobalTopThree();

    List<LeaderboardEntryResponse> getLeaderboardTopThreeById(UUID leaderboardId);

    LeaderboardResponse getLeaderboardById(UUID id);

    LeaderboardResponse createLeaderboard(LeaderboardRequest request);

    LeaderboardResponse updateLeaderboard(UUID id, LeaderboardRequest request);

    void deleteLeaderboard(UUID id);
}