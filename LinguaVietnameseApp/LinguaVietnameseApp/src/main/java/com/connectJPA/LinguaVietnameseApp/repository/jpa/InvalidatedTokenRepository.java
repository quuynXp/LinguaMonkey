package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.InvalidatedToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;

public interface InvalidatedTokenRepository extends JpaRepository<InvalidatedToken, String> {
    boolean existsByToken(String token);

    void deleteByExpiryTimeBefore(OffsetDateTime now);
}
