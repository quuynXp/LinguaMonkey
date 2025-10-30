package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.LessonType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Data
@Table(name = "lessons")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
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

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    private Integer orderIndex;

    private String description;

    @Column(name = "is_free", nullable = false)
    private boolean isFree = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "lesson_type")
    private LessonType lessonType;

    @Column(name = "skill_types") // save as CSV e.g. "LISTENING,SPEAKING"
    private String skillTypes;

    @Column(name = "lesson_series_id")
    private UUID lessonSeriesId;

    @Column(name = "lesson_category_id")
    private UUID lessonCategoryId;

    @Column(name = "lesson_sub_category_id")
    private UUID lessonSubCategoryId;
}
