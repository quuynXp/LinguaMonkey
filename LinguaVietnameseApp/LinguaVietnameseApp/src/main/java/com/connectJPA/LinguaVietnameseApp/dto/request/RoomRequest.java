package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class RoomRequest {
    @NotBlank(message = "Room name is required")
    @Size(max = 255, message = "Room name must not exceed 255 characters")
    private String roomName;

    private UUID creatorId;

    private String description;


    @Min(2)
    private int maxMembers;

    @NotNull
    private RoomPurpose purpose;

    @NotNull
    private RoomType roomType;

    private boolean isDeleted = false;
}
