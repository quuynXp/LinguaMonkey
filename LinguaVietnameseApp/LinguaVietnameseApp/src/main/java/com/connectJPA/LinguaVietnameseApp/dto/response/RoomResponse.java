package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomStatus;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoomResponse {
    private UUID roomId;
    private String roomName;
    private String roomCode;
    private String content;
    private int maxMembers;

    private String password;
    private String secretKey;
    
    private UUID creatorId;
    private String creatorName;
    private String creatorAvatarUrl;

    private String avatarUrl;
    private int memberCount;
    
    private boolean partnerIsOnline;
    private String partnerLastActiveText;
    
    private String lastMessage;
    private String lastMessageType;
    
    @JsonProperty("isRead")
    private boolean isRead; 

    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime lastMessageTime;

    private RoomPurpose purpose;
    private RoomType roomType;
    private RoomStatus status;
    
    private List<UserProfileResponse> members;

    private String lastMessageSenderId; 
    private String lastMessageSenderEphemeralKey;
    private String lastMessageInitializationVector;
    private String lastMessageSelfContent;
    private String lastMessageSelfEphemeralKey;
    private String lastMessageSelfInitializationVector;

    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
}