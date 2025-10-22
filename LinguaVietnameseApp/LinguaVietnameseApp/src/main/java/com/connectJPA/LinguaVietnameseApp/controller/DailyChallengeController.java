package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/daily-challenges")
@RequiredArgsConstructor
public class DailyChallengeController {

    private final DailyChallengeService dailyChallengeService;

    @GetMapping("/today")
    public List<UserDailyChallenge> getToday(@RequestParam UUID userId) {
        return dailyChallengeService.getTodayChallenges(userId);
    }

    @PostMapping("/assign")
    public UserDailyChallenge assign(@RequestParam UUID userId) {
        return dailyChallengeService.assignChallenge(userId);
    }

    @PostMapping("/complete/{challengeId}")
    public void complete(@RequestParam UUID userId, @PathVariable UUID challengeId) {
        dailyChallengeService.completeChallenge(userId, challengeId);
    }
}
