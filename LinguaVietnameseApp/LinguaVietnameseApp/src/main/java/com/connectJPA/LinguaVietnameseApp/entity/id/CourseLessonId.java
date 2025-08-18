package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
@Builder
public class CourseLessonId implements Serializable {
    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;
}

