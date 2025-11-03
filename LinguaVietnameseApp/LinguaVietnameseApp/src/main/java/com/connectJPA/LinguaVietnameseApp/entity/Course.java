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
import java.util.List;
import java.util.UUID;

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

    @Column(name = "description")
    private String description;

    @Column(name = "difficulty_level")
    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficultyLevel;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    private CourseType type;

    private BigDecimal price;

    @Column(name = "language_code")
    private String languageCode;

    private UUID creatorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    private CourseApprovalStatus approvalStatus = CourseApprovalStatus.PENDING;

    public String getThumbnail() {
        return thumbnailUrl;
    }

    @OneToMany(mappedBy = "courseId", fetch = FetchType.LAZY)
    private List<Lesson> lessonList;

    public List<Lesson> getLessons() {
        return lessonList != null ? lessonList : Collections.emptyList();
    }
}

