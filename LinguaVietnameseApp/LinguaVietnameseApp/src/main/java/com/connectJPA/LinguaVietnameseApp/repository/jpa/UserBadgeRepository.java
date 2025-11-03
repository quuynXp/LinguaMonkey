package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import com.connectJPA.LinguaVietnameseApp.entity.UserBadge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserBadgeId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserBadgeRepository extends JpaRepository<UserBadge, UserBadgeId> {
    List<Badge> findById_UserId(UUID userId);
}

