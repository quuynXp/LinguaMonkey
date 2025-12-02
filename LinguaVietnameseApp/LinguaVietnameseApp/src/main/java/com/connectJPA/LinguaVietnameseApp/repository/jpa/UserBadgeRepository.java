package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import com.connectJPA.LinguaVietnameseApp.entity.UserBadge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserBadgeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface UserBadgeRepository extends JpaRepository<UserBadge, UserBadgeId> {

    @Query("SELECT ub.id.badgeId FROM UserBadge ub WHERE ub.id.userId = :userId AND ub.isDeleted = false")
    Set<UUID> findBadgeIdsByUserId(@Param("userId") UUID userId);

    @Query("SELECT ub.badge FROM UserBadge ub WHERE ub.id.userId = :userId AND ub.isDeleted = false")
    List<Badge> findBadgesByUserId(@Param("userId") UUID userId);

    Optional<UserBadge> findFirstByIdUserIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID userId);

    List<UserBadge> findByUser_UserIdAndCreatedAtBetween(UUID userId, OffsetDateTime startOdt, OffsetDateTime endOdt);
}