package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorizationRequest {
    private UUID userId;
    private ContentType contentType;
    private UUID contentId; // Optional, for EVENT, LESSON, VIDEO
    private String noteText; // Optional, for NOTE, VOCABULARY, FORMULA
    private boolean isFavorite;
}
