package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "lesson_series")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class LessonSeries extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "lesson_series_id")
    private UUID lessonSeriesId;

    @Column(name = "lesson_series_name", nullable = false, unique = true)
    private String lessonSeriesName;

    @Column(name = "title", nullable = false)
    private String title;

    private String languageCode;

    @Column(name = "description")
    private String description;
}

