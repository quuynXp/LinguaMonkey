package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.LessonType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "lessons")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@ToString(callSuper = true, exclude = {"courseVersions", "lessonQuestions"})
public class Lesson extends BaseEntity {

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

    // --- NEW FIELD: Supports "Just Media" lessons (1 or many videos/docs) ---
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "lesson_media", joinColumns = @JoinColumn(name = "lesson_id"))
    @Column(name = "media_url")
    @Builder.Default
    private List<String> mediaUrls = new ArrayList<>();
    
    @JsonIgnore
    @OneToMany(mappedBy = "lesson", fetch = FetchType.LAZY)
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

    @JsonIgnore
    @OneToMany(mappedBy = "lesson", fetch = FetchType.LAZY)
    @Builder.Default
    private List<LessonQuestion> lessonQuestions = new ArrayList<>();

    @Column(name = "pass_score_percent")
    private Integer passScorePercent;

    @Column(name = "shuffle_questions")
    private Boolean shuffleQuestions = false;

    @Column(name = "allowed_retake_count")
    private Integer allowedRetakeCount = 0;
}