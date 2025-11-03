package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CourseVersionLessonId implements Serializable {

    @Column(name = "version_id")
    private UUID versionId;

    @Column(name = "lesson_id")
    private UUID lessonId;
}
