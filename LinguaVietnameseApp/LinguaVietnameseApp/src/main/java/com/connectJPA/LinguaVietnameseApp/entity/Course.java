package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
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
    @JoinColumn(name = "latest_public_version_id")
    private CourseVersion latestPublicVersion;

    @OneToMany(
            mappedBy = "course",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<CourseVersion> allVersions;

    @Column(name = "creator_id")
    private UUID creatorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    private CourseApprovalStatus approvalStatus = CourseApprovalStatus.PENDING;

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