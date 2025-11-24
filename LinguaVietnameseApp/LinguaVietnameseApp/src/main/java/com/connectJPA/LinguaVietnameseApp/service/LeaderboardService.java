package com.connectJPA.LinguaVietnameseApp.service;



import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardRequest;

import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;

import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardResponse;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;



import java.util.List;

import java.util.UUID;



public interface LeaderboardService {



    // Cần giữ lại hàm này nếu nó được gọi từ service khác, nhưng không dùng cho Top 3 Global nữa

    List<LeaderboardEntryResponse> getGlobalTopThree(); // OLD: Exp from User table



    // NEW: Hàm này sẽ được gọi từ Controller cho endpoint /top-3

    List<LeaderboardEntryResponse> getTop3GlobalLeaderboardEntries();



    List<LeaderboardEntryResponse> getLeaderboardTopThreeById(UUID leaderboardId);



    Page<LeaderboardResponse> getAllLeaderboards(String tab, Pageable pageable);



    LeaderboardResponse getLeaderboardById(UUID id);



    LeaderboardResponse createLeaderboard(LeaderboardRequest request);



    LeaderboardResponse updateLeaderboard(UUID id, LeaderboardRequest request);



    void deleteLeaderboard(UUID id);

}