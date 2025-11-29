package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.Where;


@Data
@Entity
@Table(name = "course_reviews")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class CourseReview extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "review_id")
    private UUID reviewId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "language_code")
    private String languageCode;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "rating", nullable = false)
    private BigDecimal rating;

    private int likeCount;
    private int dislikeCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private CourseReview parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    @Where(clause = "is_deleted = false")
    @OrderBy("createdAt ASC")
    private List<CourseReview> replies = new ArrayList<>();

    @Column(name = "comment")
    private String comment;

    @Column(name = "reviewed_at", nullable = false)
    private OffsetDateTime reviewedAt;
}

