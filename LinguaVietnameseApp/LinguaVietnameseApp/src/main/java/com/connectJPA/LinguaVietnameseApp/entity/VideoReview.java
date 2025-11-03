package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name="video_reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoReview extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID reviewId;
    private UUID videoId;
    private UUID userId;
    private Integer rating; // 1..5
    @Column(columnDefinition = "text")
    private String content;
    private Integer likeCount;
    private Integer dislikeCount;
}

