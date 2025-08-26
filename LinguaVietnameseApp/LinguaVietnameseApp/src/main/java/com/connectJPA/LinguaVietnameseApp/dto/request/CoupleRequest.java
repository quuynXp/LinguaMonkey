package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CoupleRequest {
    private UUID user1Id;
    private UUID user2Id;
    private LocalDate startDate;
    private LocalDate anniversary;
    private String sharedAvatarUrl;
    private String note;
    private String status; // optional
}
