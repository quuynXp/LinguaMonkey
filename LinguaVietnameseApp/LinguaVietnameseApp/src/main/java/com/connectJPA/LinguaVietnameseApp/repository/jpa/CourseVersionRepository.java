package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
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
     * Sử dụng Derived Query Method findTopBy... để đảm bảo chỉ trả về 1 kết quả (LIMIT 1).
     */
    Optional<CourseVersion> findTopByCourse_CourseIdAndStatusOrderByVersionNumberDesc(UUID courseId, VersionStatus status);

    /**
     * Tìm phiên bản MỚI NHẤT (theo versionNumber) của một Course, không bị xóa.
     * Sử dụng Derived Query Method findTopBy... để đảm bảo chỉ trả về 1 kết quả (LIMIT 1).
     */
    Optional<CourseVersion> findTopByCourse_CourseIdAndIsDeletedFalseOrderByVersionNumberDesc(UUID courseId);

    List<CourseVersion> findByCourse_CourseIdAndStatusAndIsDeletedFalse(UUID courseId, VersionStatus status);

    List<CourseVersion> findByCourse_CourseIdAndIsDeletedFalse(UUID courseId);


    /**
     * Tìm phiên bản MỚI NHẤT (theo versionNumber) của một Course có trạng thái PUBLIC.
     * (Hàm này có thể không cần nếu Course.latestPublicVersionId được cập nhật đúng)
     * Thay vào đó, chúng ta có thể dùng hàm này để tìm phiên bản public *trước đó* để so sánh.
     */
    @Query("SELECT cv FROM CourseVersion cv WHERE cv.course.courseId = :courseId " +
            "AND cv.status = 'PUBLIC' " +
            "ORDER BY cv.versionNumber DESC")
    Optional<CourseVersion> findLatestPublicVersionByCourseId(@Param("courseId") UUID courseId);

    List<CourseVersion> findByStatusAndPublishedAtBeforeAndIsDeletedFalse(String status, OffsetDateTime now);

    boolean existsByCourse_CourseIdAndStatus(UUID courseId, VersionStatus status);
}