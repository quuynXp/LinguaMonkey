package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.VideoCallType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGroupCallRequest {
    @NotNull(message = "Caller ID is required")
    private UUID callerId;

    @NotEmpty(message = "Participant IDs cannot be empty")
    private List<UUID> participantIds;

    @NotNull(message = "Video call type is required")
    private VideoCallType videoCallType;
}