package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionLesson;
import com.connectJPA.LinguaVietnameseApp.entity.id.CourseVersionLessonId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourseVersionLessonRepository extends JpaRepository<CourseVersionLesson, CourseVersionLessonId> {

    /**
     * Tìm tất cả các Lesson trong một Version, sắp xếp theo thứ tự.
     * Dùng để clone khi tạo draft mới.
     */
    List<CourseVersionLesson> findByCourseVersion_VersionIdOrderByOrderIndex(UUID versionId);

    /**
     * Xóa tất cả các lesson khỏi một version (dùng khi cập nhật bản DRAFT).
     * Dùng tên phương thức dẫn xuất (derived method name) sẽ an toàn hơn.
     */
    @Transactional
    @Modifying
    void deleteAllByCourseVersion_VersionId(UUID versionId);

    long countByCourseVersion_VersionId(UUID versionId);

    List<CourseVersionLesson> findByLesson_LessonId(UUID lessonId);

    // Hoặc dùng HQL nếu cần:
    // @Transactional
    // @Modifying
    // @Query("DELETE FROM CourseVersionLesson cvl WHERE cvl.courseVersion.versionId = :versionId")
    // void deleteAllByVersionId(@Param("versionId") UUID versionId);
}