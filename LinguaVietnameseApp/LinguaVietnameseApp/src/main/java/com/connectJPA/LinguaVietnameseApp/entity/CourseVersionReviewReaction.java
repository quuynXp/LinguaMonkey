package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.ReactionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Data
@Entity
@Table(name = "course_review_reactions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "review_id"}) // Đảm bảo 1 user chỉ có 1 reaction cho 1 review
})
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class CourseVersionReviewReaction extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "reaction_id")
    private UUID reactionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "review_id", nullable = false)
    private UUID reviewId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private ReactionType type; // LIKE hoặc DISLIKE
}