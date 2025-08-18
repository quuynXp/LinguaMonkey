package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class Character3dRequest {
    @NotBlank(message = "Character3D name is required")
    @Size(max = 50, message = "Character3D name must not exceed 50 characters")
    private String character3dName;

    private String description;

    @Size(max = 255, message = "Model URL must not exceed 255 characters")
    private String modelUrl;

    private boolean isDeleted = false;
}

