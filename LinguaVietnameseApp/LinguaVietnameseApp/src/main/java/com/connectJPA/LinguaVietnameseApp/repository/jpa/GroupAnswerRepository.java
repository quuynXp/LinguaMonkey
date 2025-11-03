package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.GroupAnswer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface GroupAnswerRepository extends JpaRepository<GroupAnswer, UUID> {
    @Query("SELECT ga FROM GroupAnswer ga WHERE ga.groupSessionId = :groupSessionId AND ga.userId = :userId AND ga.isDeleted = false")
    Page<GroupAnswer> findByGroupSessionIdAndUserIdAndIsDeletedFalse(@Param("groupSessionId") UUID groupSessionId, @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT ga FROM GroupAnswer ga WHERE ga.groupSessionId = :groupSessionId AND ga.userId = :userId AND ga.isDeleted = false")
    Optional<GroupAnswer> findByGroupSessionIdAndUserIdAndIsDeletedFalse(@Param("groupSessionId") UUID groupSessionId, @Param("userId") UUID userId);

    @Query("UPDATE GroupAnswer ga SET ga.isDeleted = true, ga.deletedAt = CURRENT_TIMESTAMP WHERE ga.groupSessionId = :groupSessionId AND ga.userId = :userId AND ga.isDeleted = false")
    void softDeleteByGroupSessionIdAndUserId(@Param("groupSessionId") UUID groupSessionId, @Param("userId") UUID userId);
}