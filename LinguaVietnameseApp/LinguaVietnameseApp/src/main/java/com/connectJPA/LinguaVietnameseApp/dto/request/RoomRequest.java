package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoomRequest {
    @NotBlank(message = "Room name is required")
    @Size(max = 255, message = "Room name must not exceed 255 characters")
    private String roomName;

    private UUID creatorId;

    private String description;

    @Min(value = 2, message = "Max members must be at least 2")
    private int maxMembers;

    private RoomPurpose purpose;

    private RoomType roomType;

    private String roomCode;

    private String password;

    private boolean isDeleted = false;

    private List<UUID> memberIds;
}