package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
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
    private String translatedText;
    private String translatedLang;
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

    public ChatMessageResponse(UUID chatMessageId, UUID roomId, UUID senderId, UUID receiverId, String content, String mediaUrl, MessageType messageType, RoomPurpose purpose, boolean read, String translatedLang, String translatedText, boolean deleted, OffsetDateTime sentAt, OffsetDateTime updatedAt, OffsetDateTime deletedAt) {
        this.chatMessageId = chatMessageId;
        this.roomId = roomId;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.content = content;
        this.mediaUrl = mediaUrl;
        this.messageType = messageType;
        this.purpose = purpose;
        this.isRead =read;
        this.translatedLang = translatedLang;
        this.translatedText = translatedText;
        this.isDeleted = deleted;
        this.sentAt = sentAt;
        this.updatedAt = updatedAt;
        this.deletedAt = deletedAt;
    }
}
