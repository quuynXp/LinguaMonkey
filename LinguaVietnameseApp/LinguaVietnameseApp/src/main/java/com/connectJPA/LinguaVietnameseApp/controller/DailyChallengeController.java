package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserDailyChallengeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.mapper.UserDailyChallengeMapper;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/daily-challenges")
@RequiredArgsConstructor
public class DailyChallengeController {

    private final DailyChallengeService dailyChallengeService;
    private final UserDailyChallengeMapper userDailyChallengeMapper;

    @Operation(summary = "Get all challenges for today (Daily + Weekly)")
    @GetMapping("/today")
    public AppApiResponse<List<UserDailyChallengeResponse>> getToday(@RequestParam UUID userId) {
        List<UserDailyChallenge> entities = dailyChallengeService.getTodayChallenges(userId);
        
        List<UserDailyChallengeResponse> response = entities.stream()
                .map(userDailyChallengeMapper::toResponse)
                .collect(Collectors.toList());

        return AppApiResponse.<List<UserDailyChallengeResponse>>builder()
                .code(200)
                .message("Successfully retrieved challenges")
                .result(response)
                .build();
    }

    @Operation(summary = "Claim reward for a completed challenge")
    @PostMapping("/claim/{challengeId}")
    public AppApiResponse<Void> claimReward(@RequestParam UUID userId, @PathVariable UUID challengeId) {
        dailyChallengeService.claimReward(userId, challengeId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Reward claimed successfully")
                .build();
    }
}