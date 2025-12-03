package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeProgressResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/badges")
@RequiredArgsConstructor
public class BadgeController {
    private final BadgeService badgeService;
    private final MessageSource messageSource;

    @GetMapping
    public AppApiResponse<Page<BadgeResponse>> getAllBadges(
            @RequestParam(required = false) String badgeName,
            @RequestParam(defaultValue = "en") String languageCode,
            Pageable pageable,
            Locale locale) {
        Page<BadgeResponse> badges = badgeService.getAllBadges(badgeName, languageCode, pageable);
        return AppApiResponse.<Page<BadgeResponse>>builder()
                .code(200)
                .result(badges)
                .build();
    }

    @GetMapping("/user/{userId}/progress")
    @PreAuthorize("#userId.toString() == authentication.name or hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<List<BadgeProgressResponse>> getBadgeProgressForUser(
            @PathVariable UUID userId,
            Locale locale) {
        List<BadgeProgressResponse> progress = badgeService.getBadgeProgressForUser(userId);
        return AppApiResponse.<List<BadgeProgressResponse>>builder()
                .code(200)
                .result(progress)
                .build();
    }
    
    @PostMapping("/claim/{badgeId}")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<Void> claimBadge(
            @RequestParam UUID userId, 
            @PathVariable UUID badgeId,
            Locale locale) {
        badgeService.claimBadge(userId, badgeId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Badge claimed and coins added!")
                .build();
    }

    @GetMapping("/{id}")
    public AppApiResponse<BadgeResponse> getBadgeById(@PathVariable UUID id) {
        return AppApiResponse.<BadgeResponse>builder().code(200).result(badgeService.getBadgeById(id)).build();
    }

    @PostMapping
    public AppApiResponse<BadgeResponse> createBadge(@Valid @RequestBody BadgeRequest request) {
        return AppApiResponse.<BadgeResponse>builder().code(201).result(badgeService.createBadge(request)).build();
    }

    @PutMapping("/{id}")
    public AppApiResponse<BadgeResponse> updateBadge(@PathVariable UUID id, @Valid @RequestBody BadgeRequest request) {
        return AppApiResponse.<BadgeResponse>builder().code(200).result(badgeService.updateBadge(id, request)).build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> deleteBadge(@PathVariable UUID id) {
        badgeService.deleteBadge(id);
        return AppApiResponse.<Void>builder().code(200).build();
    }
}