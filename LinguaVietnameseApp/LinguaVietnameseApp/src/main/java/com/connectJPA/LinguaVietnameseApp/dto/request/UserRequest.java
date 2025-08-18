package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class UserRequest {
    @NotBlank()
    @Size(max = 50, message = "Username must not exceed 50 characters")
    private String username;

    @NotNull(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @NotNull(message = "Password is required")
    @NotBlank
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
    private UUID nativeLanguageId;
    private String authProvider;
    private String country;
    private Integer level = 1;
    private Integer score = 0;
    private Integer streak = 0;

    private boolean isDeleted = false;
}
