package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class LessonOrderInSeriesId implements Serializable {
    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "lesson_series_id", nullable = false)
    private UUID lessonSeriesId;
}
