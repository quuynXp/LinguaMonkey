package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomStatus;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoomResponse {
    private UUID roomId;
    private String roomName;
    private String roomCode;
    private String content; // Description
    private int maxMembers;
    
    // Creator Info
    private UUID creatorId;
    private String creatorName;
    private String creatorAvatarUrl;

    // Display Info
    private String avatarUrl; // Dynamic: User Avatar (1-1) or Group Avatar
    private int memberCount;
    
    // Preview Info
    private String lastMessage;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime lastMessageTime;

    private RoomPurpose purpose;
    private RoomType roomType;
    private RoomStatus status;
    
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
}