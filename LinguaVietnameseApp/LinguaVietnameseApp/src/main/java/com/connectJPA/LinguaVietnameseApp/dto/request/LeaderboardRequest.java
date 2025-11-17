package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;
import lombok.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Builder
public class LeaderboardRequest {
    @Size(max = 50, message = "Period must not exceed 50 characters")
    private String period;

    @Size(max = 50, message = "Tab must not exceed 50 characters")
    private String tab;

    private OffsetDateTime snapshotDate;
    private boolean isDeleted = false;
}
