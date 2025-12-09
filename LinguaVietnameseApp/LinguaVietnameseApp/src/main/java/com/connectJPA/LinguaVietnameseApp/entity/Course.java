package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
@Setter
@ToString(callSuper = true, exclude = {"latestPublicVersion", "allVersions"})
@Entity
@Table(name = "courses")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Course extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "course_id")
    private UUID courseId;

    @Column(name = "title", nullable = false)
    private String title;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "latest_public_version_id", referencedColumnName = "version_id")
    private CourseVersion latestPublicVersion;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private List<CourseVersion> allVersions;

    @Column(name = "creator_id")
    private UUID creatorId;

    private OffsetDateTime lastQualityWarningAt;
    

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    private CourseApprovalStatus approvalStatus = CourseApprovalStatus.PENDING;

    @Column(name = "is_admin_created", nullable = false)
    private Boolean isAdminCreated = false;

    public List<Lesson> getLessons() {
        if (this.latestPublicVersion == null || this.latestPublicVersion.getLessons() == null) {
            return Collections.emptyList();
        }
        return this.latestPublicVersion.getLessons().stream()
                .sorted(Comparator.comparingInt(CourseVersionLesson::getOrderIndex))
                .map(CourseVersionLesson::getLesson)
                .collect(Collectors.toList());
    }
}