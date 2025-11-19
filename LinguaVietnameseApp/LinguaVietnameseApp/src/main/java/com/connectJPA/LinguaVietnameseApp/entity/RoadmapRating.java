package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "roadmap_ratings", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "roadmap_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapRating {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "rating_id")
    private UUID ratingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private Roadmap roadmap;

    @Column(name = "rating", nullable = false)
    private Double rating; // 1.0 - 5.0

    @Column(name = "comment")
    private String comment;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @PrePersist
    protected void onCreate() {
        if (isDeleted == null) isDeleted = false;
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
