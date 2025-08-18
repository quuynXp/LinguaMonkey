package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface BadgeRepository extends JpaRepository<Badge, UUID> {
    @Query(value = "SELECT * FROM Badge WHERE badge_name LIKE %:badgeName% AND deleted = false LIMIT :limit OFFSET :offset",
            countQuery = "SELECT COUNT(*) FROM badges WHERE badge_name LIKE %:badgeName% AND deleted = false",
            nativeQuery = true)
    Page<Badge> findByBadgeNameContainingAndIsDeletedFalse(@Param("badgeName") String badgeName, Pageable pageable);

    @Query(value = "SELECT * FROM Badge WHERE badge_id = :id AND deleted = false", nativeQuery = true)
    Optional<Badge> findByBadgeIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE Badge f SET f.isDeleted = true, f.deletedAt = CURRENT_TIMESTAMP WHERE f.id = :id")
    void softDeleteBadgeByBadgeId(@Param("id") UUID id);
}
