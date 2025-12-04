package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.id.CourseVersionLessonId;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Entity
@Table(name = "course_version_lessons")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"courseVersion", "lesson"})
public class CourseVersionLesson {

    @EmbeddedId
    private CourseVersionLessonId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("versionId")
    @JoinColumn(name = "version_id")
    private CourseVersion courseVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("lessonId")
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    public CourseVersionLesson(CourseVersion courseVersion, Lesson lesson, int orderIndex) {
        this.id = new CourseVersionLessonId(courseVersion.getVersionId(), lesson.getLessonId());
        this.courseVersion = courseVersion;
        this.lesson = lesson;
        this.orderIndex = orderIndex;
    }
}