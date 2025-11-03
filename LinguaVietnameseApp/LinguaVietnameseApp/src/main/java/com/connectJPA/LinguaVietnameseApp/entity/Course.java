package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.listener.ElasticsearchEntityListener;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.elasticsearch.annotations.Document;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@EntityListeners(ElasticsearchEntityListener.class)
@Data
@Document(indexName = "courses")
@Entity
@Table(name = "courses")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Course extends BaseEntity {
    @org.springframework.data.annotation.Id
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "course_id")
    private UUID courseId;

    @Column(name = "title", nullable = false)
    private String title;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "latest_public_version_id")
    private CourseVersion latestPublicVersion;

    // THÊM: Quan hệ OneToMany tới tất cả các phiên bản của khóa học này.
    @OneToMany(
            mappedBy = "course",
            cascade = CascadeType.ALL, // Quản lý vòng đời của version cùng với course
            orphanRemoval = true
    )
    private List<CourseVersion> allVersions;

    @Column(name = "difficulty_level")
    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficultyLevel;

    @Enumerated(EnumType.STRING)
    private CourseType type;

    private BigDecimal price;

    @Column(name = "language_code")
    private String languageCode;

    private UUID creatorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    private CourseApprovalStatus approvalStatus = CourseApprovalStatus.PENDING;

    public List<Lesson> getLessons() {
        if (this.latestPublicVersion == null || this.latestPublicVersion.getLessons() == null) {
            return Collections.emptyList(); // Trả về danh sách rỗng nếu không có
        }

        List<CourseVersionLesson> versionLessons = this.latestPublicVersion.getLessons();

        return versionLessons.stream()
                .sorted(Comparator.comparingInt(CourseVersionLesson::getOrderIndex))
                .map(CourseVersionLesson::getLesson)
                .collect(Collectors.toList());
    }
}

