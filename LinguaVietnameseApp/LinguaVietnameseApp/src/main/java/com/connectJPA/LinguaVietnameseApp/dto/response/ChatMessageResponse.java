package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessageResponse {
    private UUID chatMessageId;
    private UUID roomId;
    private UUID senderId;
    private UUID receiverId;
    private String content;
    private String mediaUrl;
    private MessageType messageType;
    
    private String senderEphemeralKey;
    private Integer usedPreKeyId;
    private String initializationVector;
    private String selfContent;
    private String selfEphemeralKey;
    private String selfInitializationVector;
    private Map<String, String> translations;
    
    private RoomPurpose purpose;
    private boolean isRead;
    private boolean isDeleted;
    private UserProfileResponse senderProfile;
    
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime sentAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime deletedAt;
}