package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.AgeRange;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.enums.LearningPlace;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {
    @Size(max = 50, message = "Username must not exceed 50 characters")
    private String username;

    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(min = 6, max = 255, message = "Password must be between 6 and 255 characters")
    private String password;

    @Size(max = 255, message = "Fullname must not exceed 255 characters")
    private String fullname;

    @Size(max = 50, message = "Nickname must not exceed 50 characters")
    private String nickname;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    @Size(max = 255, message = "Avatar URL must not exceed 255 characters")
    private String avatarUrl;

    private UUID character3dId;
    private UUID badgeId;
    private AgeRange ageRange;
    private LearningPlace learningPace;
    private List<UUID> interestestIds;
    private List<String> goalIds;
    private List<String> certificationIds;
    private String nativeLanguageCode;
    private ProficiencyLevel proficiency;
    private List<String> languages;
    private Country country;
    private Integer level = 1;
    private Integer score = 0;
    private Integer streak = 0;

}
