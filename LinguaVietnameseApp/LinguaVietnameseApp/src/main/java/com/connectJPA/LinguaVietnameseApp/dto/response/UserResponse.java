// LinguaVietnameseApp/LinguaVietnameseApp/src/main/java/com/connectJPA/LinguaVietnameseApp/dto/response/UserResponse.java
package com.connectJPA.LinguaVietnameseApp.dto.response;

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
    private Country country;

    // New Fields matching Entity
    private AgeRange ageRange;
    private ProficiencyLevel proficiency;
    private LearningPace learningPace;

    private int level;
    private int exp;
    private int expToNextLevel;
    private Double progress;
    private int streak;
    private boolean isDeleted;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<String> languages;
}