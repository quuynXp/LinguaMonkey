package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "course_versions")
@SQLDelete(sql = "UPDATE course_versions SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE version_id = ?")
@Where(clause = "is_deleted = false")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"lessons", "course"})
public class CourseVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "version_id")
    private UUID versionId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", insertable = false, updatable = false)
    private Course course;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "difficulty_level")
    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficultyLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private CourseType type;

    @Column(name = "category_code")
    private String categoryCode;

    @Column(name = "price")
    private BigDecimal price;

    @Column(name = "language_code")
    private String languageCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private VersionStatus status;

    @Column(name = "reason_for_change", columnDefinition = "text")
    private String reasonForChange;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "instruction_language")
    private String instructionLanguage;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @OneToMany(mappedBy = "courseVersion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<CourseVersionLesson> lessons;

    @Column(name = "is_integrity_valid")
    private Boolean isIntegrityValid;

    @Column(name = "is_content_valid")
    private Boolean isContentValid;

    @Column(name = "is_system_reviewed")
    private Boolean isSystemReviewed = false;

    @Column(name = "validation_warnings", columnDefinition = "text")
    private String validationWarnings;

    @Column(name = "system_rating")
    private Float systemRating;
}