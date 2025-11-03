package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.Country;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.List; // QUAN TRỌNG: Import List
import java.util.UUID;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private UUID userId;
    private String email;
    private String fullname;
    private String nickname;
    private String bio;
    private String phone;
    private String avatarUrl;
    private UUID character3dId;
    private UUID badgeId; // (Giả định)
    private String nativeLanguageId; // (nativeLanguageCode từ entity)
    private String authProvider; // (Giả định)
    private Country country;
    private int level;
    private int exp;
    private int expToNextLevel; // (Được tính toán)
    private Double progress; // (Giả định, DTO có thể là Double/BigDecimal)
    private int streak;
    private boolean isDeleted;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // ===== TRƯỜNG MỚI ĐƯỢC THÊM =====
    private List<String> languages;
}