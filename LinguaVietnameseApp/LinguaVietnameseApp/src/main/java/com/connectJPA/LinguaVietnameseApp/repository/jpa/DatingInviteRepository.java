package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.DatingInvite;
import com.connectJPA.LinguaVietnameseApp.enums.DatingInviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DatingInviteRepository extends JpaRepository<DatingInvite, UUID> {
    Optional<DatingInvite> findTopBySenderIdAndTargetIdAndStatus(UUID senderId, UUID targetId, DatingInviteStatus status);
    List<DatingInvite> findByExpiresAtBeforeAndStatus(OffsetDateTime time, DatingInviteStatus status);
    List<DatingInvite> findByTargetIdAndStatus(UUID targetId, DatingInviteStatus status);
}
