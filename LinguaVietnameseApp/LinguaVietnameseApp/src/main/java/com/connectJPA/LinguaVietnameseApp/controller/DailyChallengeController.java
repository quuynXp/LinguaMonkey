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

    @Operation(summary = "Get today's challenges for user")
    @GetMapping("/today")
    public AppApiResponse<List<UserDailyChallengeResponse>> getToday(@RequestParam UUID userId) {
        List<UserDailyChallenge> entities = dailyChallengeService.getTodayChallenges(userId);
        List<UserDailyChallengeResponse> response = entities.stream()
                .map(userDailyChallengeMapper::toResponse)
                .collect(Collectors.toList());

        return AppApiResponse.<List<UserDailyChallengeResponse>>builder()
                .code(200)
                .message("Successfully retrieved daily challenges")
                .result(response)
                .build();
    }

    @Operation(summary = "Assign new challenge manually")
    @PostMapping("/assign")
    public AppApiResponse<UserDailyChallengeResponse> assign(@RequestParam UUID userId) {
        UserDailyChallenge entity = dailyChallengeService.assignChallenge(userId);
        return AppApiResponse.<UserDailyChallengeResponse>builder()
                .code(200)
                .message("Challenge assigned successfully")
                .result(userDailyChallengeMapper.toResponse(entity))
                .build();
    }

    @Operation(summary = "Complete a challenge")
    @PostMapping("/complete/{challengeId}")
    public AppApiResponse<Void> complete(@RequestParam UUID userId, @PathVariable UUID challengeId) {
        dailyChallengeService.completeChallenge(userId, challengeId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Challenge completed successfully")
                .build();
    }
}