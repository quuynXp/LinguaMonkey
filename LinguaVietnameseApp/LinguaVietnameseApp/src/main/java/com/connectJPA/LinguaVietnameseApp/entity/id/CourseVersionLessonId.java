package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CourseVersionLessonId implements Serializable {

    @Column(name = "version_id")
    private UUID versionId;

    @Column(name = "lesson_id")
    private UUID lessonId;
}