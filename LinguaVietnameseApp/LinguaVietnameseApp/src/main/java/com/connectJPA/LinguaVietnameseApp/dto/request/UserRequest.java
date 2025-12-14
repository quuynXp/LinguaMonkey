package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.AgeRange;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.enums.LearningPace;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {

    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(min = 6, max = 255, message = "Password must be between 6 and 255 characters")
    private String password;

    @Size(max = 255, message = "Fullname must not exceed 255 characters")
    private String fullname;

    @Size(max = 50, message = "Nickname must not exceed 50 characters")
    private String nickname;

    private String gender;

    private String bio;

    private LocalDate dayOfBirth;

    private String phone;

    private String avatarUrl;

    private UUID character3dId;
    private UUID badgeId;
    private AgeRange ageRange;
    private LearningPace learningPace;
    private List<UUID> interestIds;
    private List<String> goalIds;
    private List<String> certificationIds;
    private String nativeLanguageCode;
    private Boolean hasFinishedSetup;
    private ProficiencyLevel proficiency;
    private List<String> languages;
    private Country country;
    private Integer level;
    private String authProvider;
    private Integer score;
    private Integer streak;
    private Boolean isVip;
    private Integer exp;

}
