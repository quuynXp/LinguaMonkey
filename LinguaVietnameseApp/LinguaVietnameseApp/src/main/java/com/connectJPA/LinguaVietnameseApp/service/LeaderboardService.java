package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LeaderboardService {
    Page<LeaderboardResponse> getAllLeaderboards(String period, String tab, Pageable pageable);
    LeaderboardResponse getLeaderboardById(UUID id);
    LeaderboardResponse createLeaderboard(LeaderboardRequest request);
    LeaderboardResponse updateLeaderboard(UUID id, LeaderboardRequest request);
    void deleteLeaderboard(UUID id);
}