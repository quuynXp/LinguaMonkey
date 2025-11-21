package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import jakarta.validation.constraints.*;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class ChatMessageRequest {
    private UUID roomId;

    @NotNull(message = "Sender ID is required")
    private UUID senderId;

    private String content;

    @Size(max = 2083, message = "Media URL must not exceed 2083 characters")
    private String mediaUrl;

    private MessageType messageType;
    private RoomPurpose purpose;
    private UUID receiverId;

    private boolean roomAutoTranslate;


    private boolean isRead = false;
    private boolean isDeleted = false;
}
