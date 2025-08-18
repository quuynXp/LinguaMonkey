package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageBody {
    private String role; // "user" or "assistant"
    private String content;
}