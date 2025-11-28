package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.CoupleProfileSummary;
import com.connectJPA.LinguaVietnameseApp.enums.AgeRange;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.enums.LearningPace;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    private UUID userId;
    private String email;
    private String fullname;
    private String nickname;
    private String bio;
    private String phone;
    private String avatarUrl;
    private UUID character3dId;
    private UUID badgeId;
    private String nativeLanguageCode;
    private String authProvider;
    private String gender;
    private Country country;

    // New Fields matching Entity
    private AgeRange ageRange;
    private ProficiencyLevel proficiency;
    private LearningPace learningPace;

    private List<String> certificationIds;
    private List<UUID> interestIds;        
    private List<String> goalIds;

    private int level;
    private int exp;
    private int expToNextLevel;
    private Double progress;
    private int streak;
    private boolean isDeleted;
    private boolean isVip;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<String> languages;

    // --- Status Flags for Frontend Routing ---
    private boolean hasFinishedSetup;
    private boolean hasDonePlacementTest;
    private OffsetDateTime lastDailyWelcomeAt;

    // --- Couple Profile Info ---
    private CoupleProfileSummary coupleProfile;
}