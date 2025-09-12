package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Data;
import java.util.UUID;

@Data
public class StartCompleteRoadmapItemRequest {
    private UUID userId;
    private UUID itemId;
    private Integer score; // optional for complete
}
