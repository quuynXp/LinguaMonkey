package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;


public record OtpRequest(@Valid @NotBlank String emailOrPhone) {}
