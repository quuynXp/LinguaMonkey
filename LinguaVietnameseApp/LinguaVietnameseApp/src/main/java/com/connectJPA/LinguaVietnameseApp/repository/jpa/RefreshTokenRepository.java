package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.RefreshToken;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    List<RefreshToken> findAllByUserId(UUID userId);

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.userId = :userId " +
       "AND TRIM(rt.token) = TRIM(:token) AND rt.isRevoked = false")
    Optional<RefreshToken> findByUserIdAndTokenAndIsRevokedFalse(
        @Param("userId") UUID userId,
        @Param("token") String token);

    void deleteByIsRevokedTrue();

    void deleteByExpiresAtBefore(Instant now);
}
