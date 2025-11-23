package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BadgeRepository extends JpaRepository<Badge, UUID> {
    @Query(value = "SELECT * FROM badges WHERE badge_name LIKE %:badgeName% AND is_deleted = false LIMIT :limit OFFSET :offset",
            countQuery = "SELECT COUNT(*) FROM badges WHERE badge_name LIKE %:badgeName% AND is_deleted = false",
            nativeQuery = true)

    Page<Badge> findByBadgeNameContainingAndIsDeletedFalse(@Param("badgeName") String badgeName, Pageable pageable);

    long countByIsDeletedFalse();
    @Query(value = "SELECT * FROM badges WHERE badge_id = :id AND is_deleted = false", nativeQuery = true)
    Optional<Badge> findByBadgeIdAndIsDeletedFalse(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE Badge f SET f.isDeleted = true, f.deletedAt = CURRENT_TIMESTAMP WHERE f.badgeId = :id")
    void softDeleteBadgeByBadgeId(@Param("id") UUID id);

    List<Badge> findAllByIsDeletedFalse();
}

