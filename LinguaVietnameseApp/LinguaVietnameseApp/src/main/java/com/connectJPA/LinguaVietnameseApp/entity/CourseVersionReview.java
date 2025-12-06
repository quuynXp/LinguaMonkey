package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Where;

@Data
@Entity
@Table(name = "course_version_reviews")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class CourseVersionReview extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "review_id")
    private UUID reviewId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_version_id", nullable = false)
    private CourseVersion courseVersion;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "language_code")
    private String languageCode;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "rating")
    private BigDecimal rating;

    private int likeCount = 0;

    private int dislikeCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private CourseVersionReview parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    @Where(clause = "is_deleted = false")
    @OrderBy("createdAt ASC")
    private List<CourseVersionReview> replies = new ArrayList<>();

    @Column(name = "comment")
    private String comment;

    @Column(name = "is_system_review")
    private boolean isSystemReview = false;

    @Column(name = "reviewed_at", nullable = false)
    @CreationTimestamp
    private OffsetDateTime reviewedAt;

    private Boolean isSystemChecked;

}