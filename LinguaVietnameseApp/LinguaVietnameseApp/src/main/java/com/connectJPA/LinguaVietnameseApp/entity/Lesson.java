package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.LessonType;
// import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.listener.ElasticsearchEntityListener;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
// import org.springframework.data.elasticsearch.annotations.Document;

import java.util.List;
import java.util.UUID;

@Entity
@Data
// @Document(indexName = "lessons")
// @EntityListeners(ElasticsearchEntityListener.class)
@Table(name = "lessons")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Lesson extends BaseEntity {
    @org.springframework.data.annotation.Id
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "lesson_id")
    private UUID lessonId;

    @Column(name = "lesson_name", nullable = false, unique = true)
    private String lessonName;

    @Column(name = "language_code")
    private String languageCode;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "exp_reward", nullable = false)
    private int expReward;

    @OneToMany(mappedBy = "lesson")
    private List<CourseVersionLesson> courseVersions;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    private Integer orderIndex;

    private String description;

    @Column(name = "is_free", nullable = false)
    private boolean isFree = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "lesson_type")
    private LessonType lessonType;

    @Column(name = "skill_types")
    @Enumerated(EnumType.STRING)
    private SkillType skillTypes;

    @Column(name = "lesson_series_id")
    private UUID lessonSeriesId;

    @Column(name = "lesson_category_id")
    private UUID lessonCategoryId;

    @Column(name = "lesson_sub_category_id")
    private UUID lessonSubCategoryId;

    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficultyLevel;

    private String thumbnailUrl;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "certificate_code")
    private String certificateCode;

    @Column(name = "pass_score_percent")
    private Integer passScorePercent;

    @Column(name = "shuffle_questions")
    private Boolean shuffleQuestions = false;

    @Column(name = "allowed_retake_count")
    private Integer allowedRetakeCount = 0;
}
