package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterResponse {
    private UserResponse user;
    private String accessToken;
    private String refreshToken;
}