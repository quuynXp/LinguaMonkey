package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class SwitchVersionRequest {
    @NotNull
    private UUID enrollmentId;

    @NotNull
    private UUID newVersionId;
}