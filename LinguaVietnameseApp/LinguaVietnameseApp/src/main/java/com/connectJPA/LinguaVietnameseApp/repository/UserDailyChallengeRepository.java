package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import org.springframework.data.jpa.repository.JpaRepository;


import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface UserDailyChallengeRepository extends JpaRepository<UserDailyChallenge, UserDailyChallengeId> {
    List<UserDailyChallenge> findByIdUserIdAndIdAssignedDate(UUID userId, OffsetDateTime assignedDate);

    List<UserDailyChallenge> findByUser_UserIdAndCreatedAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

}
