package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class VideoReviewResponse {
    private UUID reviewId;
    private UUID videoId;
    private UUID userId;
    private Integer rating;
    private String content;
    private Integer likeCount;
    private Integer dislikeCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
