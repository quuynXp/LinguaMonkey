package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.id.CourseVersionLessonId;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor; // Thêm import này

@Data
@Entity
@Table(name = "course_version_lessons")
@NoArgsConstructor // JPA luôn yêu cầu một constructor không tham số
public class CourseVersionLesson {

    @EmbeddedId
    private CourseVersionLessonId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("versionId") // Tên "versionId" phải khớp với tên trong CourseVersionLessonId
    @JoinColumn(name = "version_id")
    private CourseVersion courseVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("lessonId") // Tên "lessonId" phải khớp với tên trong CourseVersionLessonId
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    /**
     * === SỬA LỖI 2 ===
     * Thêm constructor tùy chỉnh mà Service đang gọi.
     * Hàm này tự động tạo EmbeddedId và thiết lập các quan hệ.
     */
    public CourseVersionLesson(CourseVersion courseVersion, Lesson lesson, int orderIndex) {
        // 1. Tạo và gán composite ID
        this.id = new CourseVersionLessonId(courseVersion.getVersionId(), lesson.getLessonId());

        // 2. Gán các đối tượng quan hệ
        this.courseVersion = courseVersion;
        this.lesson = lesson;

        // 3. Gán trường dữ liệu
        this.orderIndex = orderIndex;
    }
}