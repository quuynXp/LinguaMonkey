package com.connectJPA.LinguaVietnameseApp.dto.kafka;

import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiChatPersistenceRequest {
    private String userId;
    private String roomId;
    private String userPrompt;
    private String aiResponse;
    private MessageType messageType;
    private String sentAt;
}