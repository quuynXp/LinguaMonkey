package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.converter.CourseVersionEnrollmentStatusConverter;
import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.CourseVersionEnrollmentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "course_version_enrollments")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class CourseVersionEnrollment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "enrollment_id")
    private UUID enrollmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_version_id", nullable = false)
    private CourseVersion courseVersion;

    @Column(name = "progress", nullable = false)
    private Double progress = 0.0;

    @Convert(converter = CourseVersionEnrollmentStatusConverter.class)
    private CourseVersionEnrollmentStatus status;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "enrolled_at", nullable = false)
    private OffsetDateTime enrolledAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}