package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LanguageRequest {
    @NotBlank(message = "Language name is required")
    @Size(max = 50, message = "Language name must not exceed 50 characters")
    private String languageName;

    private String description;
    private boolean isDeleted = false;
}
