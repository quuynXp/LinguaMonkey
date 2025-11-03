package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseVersionRepository extends JpaRepository<CourseVersion, UUID> {

    /**
     * Tìm một phiên bản DRAFT (bản nháp) bằng ID.
     * Dùng để đảm bảo Creator chỉ có thể sửa bản nháp.
     */
    Optional<CourseVersion> findByVersionIdAndStatus(UUID versionId, VersionStatus status);

    /**
     * Tìm phiên bản MỚI NHẤT (theo versionNumber) của một Course có trạng thái PUBLIC.
     * (Hàm này có thể không cần nếu Course.latestPublicVersionId được cập nhật đúng)
     * Thay vào đó, chúng ta có thể dùng hàm này để tìm phiên bản public *trước đó* để so sánh.
     */
    @Query("SELECT cv FROM CourseVersion cv WHERE cv.course.courseId = :courseId " +
            "AND cv.status = 'PUBLIC' " +
            "ORDER BY cv.versionNumber DESC")
    Optional<CourseVersion> findLatestPublicVersionByCourseId(@Param("courseId") UUID courseId);

    boolean existsByCourse_CourseIdAndStatus(UUID courseId, VersionStatus status);
}