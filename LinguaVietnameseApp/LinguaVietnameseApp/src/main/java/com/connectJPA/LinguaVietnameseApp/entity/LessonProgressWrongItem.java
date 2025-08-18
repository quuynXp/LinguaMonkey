package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressWrongItemsId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_progress_wrong_items")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class LessonProgressWrongItem extends BaseEntity {
    @EmbeddedId
    private LessonProgressWrongItemsId id;

    @Column(name = "wrong_answer")
    private String wrongAnswer;

}
