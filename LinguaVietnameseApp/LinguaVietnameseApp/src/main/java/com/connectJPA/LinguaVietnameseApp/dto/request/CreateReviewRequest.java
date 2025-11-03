package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Data;
import java.util.UUID;

@Data
public class CreateReviewRequest {
    private UUID userId;
    private Integer rating;
    private String content;
}
