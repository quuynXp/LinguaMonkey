package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AddSuggestionRequest {
    private UUID userId;
    private UUID itemId;
    private Integer suggestedOrderIndex;
    private String reason;
}
