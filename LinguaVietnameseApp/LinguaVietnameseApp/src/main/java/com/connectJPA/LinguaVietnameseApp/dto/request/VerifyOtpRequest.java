package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

public record VerifyOtpRequest(@Valid @NotBlank String emailOrPhone, @Valid @NotBlank String code) {}
