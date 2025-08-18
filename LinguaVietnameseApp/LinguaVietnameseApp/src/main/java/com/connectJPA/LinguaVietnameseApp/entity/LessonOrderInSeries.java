package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonOrderInSeriesId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@Entity
@Table(name = "lesson_order_in_series")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class LessonOrderInSeries extends BaseEntity {
    @EmbeddedId
    private LessonOrderInSeriesId id;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

}
