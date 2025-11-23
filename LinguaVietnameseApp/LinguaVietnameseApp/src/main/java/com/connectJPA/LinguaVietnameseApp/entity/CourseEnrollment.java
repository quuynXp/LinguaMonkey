package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.converter.CourseEnrollmentStatusConverter;
import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.CourseEnrollmentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "course_enrollments")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class CourseEnrollment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "enrollment_id")
    private UUID enrollmentId;

    // @Column(name = "course_id", nullable = false)
    // private UUID courseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_version_id")
    private CourseVersion courseVersion;

    @Convert(converter = CourseEnrollmentStatusConverter.class)
    private CourseEnrollmentStatus status;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "enrolled_at", nullable = false)
    private OffsetDateTime enrolledAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}