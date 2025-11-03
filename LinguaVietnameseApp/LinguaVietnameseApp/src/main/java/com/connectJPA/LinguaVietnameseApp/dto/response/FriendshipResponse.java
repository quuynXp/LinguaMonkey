package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.FriendshipStatus;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class FriendshipResponse {
    private UUID requesterId;
    private UUID receiverId;
    private FriendshipStatus status;
    private boolean isDeleted;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;

    public FriendshipResponse(UUID user1Id, UUID user2Id, FriendshipStatus status, OffsetDateTime createdAt) {
        this.requesterId = user1Id;
        this.receiverId = user2Id;
        this.status = status;
        this.createdAt = createdAt;
    }
}
