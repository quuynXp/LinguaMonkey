package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserRoadmap;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoadmapId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRoadmapRepository extends JpaRepository<UserRoadmap, UserRoadmapId> {
//    List<UserRoadmap> findByUserRoadmapIdUserIdAndLanguage(UUID userId, String language);

    @Query("SELECT ur FROM UserRoadmap ur WHERE ur.userRoadmapId.userId = :userId AND ur.isDeleted = false")
    List<UserRoadmap> findByUserId(@Param("userId") UUID userId);

    // List đơn giản không phân trang (nếu cần)
    @Query("SELECT ur FROM UserRoadmap ur " +
            "WHERE ur.userRoadmapId.userId = :userId " +
            "AND ur.language = :language " +
            "AND ur.isDeleted = false")
    List<UserRoadmap> findByUserRoadmapIdUserIdAndLanguage(
            @Param("userId") UUID userId,
            @Param("language") String language
    );

    Optional<UserRoadmap> findByUserRoadmapIdRoadmapIdAndUserRoadmapIdUserId(
            UUID roadmapId, UUID userId
    );

    // Public roadmaps - standard methods
    @Query("SELECT ur FROM UserRoadmap ur " +
            "WHERE ur.isPublic = true " +
            "AND ur.language = :language " +
            "AND ur.isDeleted = false " +
            "ORDER BY ur.createdAt DESC")
    List<UserRoadmap> findByIsPublicTrueAndLanguage(@Param("language") String language);

    // Public roadmaps with pagination - NEW METHOD
    @Query("SELECT ur FROM UserRoadmap ur " +
            "WHERE ur.isPublic = true " +
            "AND ur.language = :language " +
            "AND ur.isDeleted = false " +
            "ORDER BY ur.createdAt DESC")
    Page<UserRoadmap> findByIsPublicTrueAndLanguageOrderByCreatedAtDesc(
            @Param("language") String language,
            Pageable pageable
    );

    // Find all public roadmaps
    @Query("SELECT ur FROM UserRoadmap ur " +
            "WHERE ur.isPublic = true " +
            "AND ur.isDeleted = false " +
            "ORDER BY ur.createdAt DESC")
    Page<UserRoadmap> findAllPublicRoadmaps(Pageable pageable);

    // Search public roadmaps
    @Query("SELECT ur FROM UserRoadmap ur " +
            "WHERE ur.isPublic = true " +
            "AND ur.isDeleted = false " +
            "AND (LOWER(ur.roadmap.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(ur.roadmap.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "ORDER BY ur.createdAt DESC")
    Page<UserRoadmap> searchPublicRoadmaps(
            @Param("search") String search,
            Pageable pageable
    );

    // Find by creator
    @Query("SELECT ur FROM UserRoadmap ur " +
            "WHERE ur.userRoadmapId.userId = :userId " +
            "AND ur.isPublic = true " +
            "AND ur.isDeleted = false")
    List<UserRoadmap> findPublicByCreator(@Param("userId") UUID userId);

    // Count public roadmaps by language
    @Query("SELECT COUNT(ur) FROM UserRoadmap ur " +
            "WHERE ur.isPublic = true " +
            "AND ur.language = :language " +
            "AND ur.isDeleted = false")
    long countPublicByLanguage(@Param("language") String language);

//    List<UserRoadmap>  findByIsPublicTrueAndLanguage(String language);



//    Optional<UserRoadmap> findByUserRoadmapIdRoadmapIdAndUserRoadmapIdUserId(UUID roadmapId, UUID userId);
}

