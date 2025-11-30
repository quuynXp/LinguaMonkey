package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CourseReviewResponse {
    private UUID reviewId;
    private UUID courseId;
    private UUID userId;
    private BigDecimal rating;
    private String userFullname;
    private String comment;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime reviewedAt;
    private boolean isDeleted;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;

    private String userAvatar;
    private String userNickname;
    private Integer likeCount;
    private Integer dislikeCount;

    private UUID parentId;
    private long replyCount;
    private List<CourseReviewResponse> topReplies;
    private boolean isLiked;
    private boolean isDisliked;
}
