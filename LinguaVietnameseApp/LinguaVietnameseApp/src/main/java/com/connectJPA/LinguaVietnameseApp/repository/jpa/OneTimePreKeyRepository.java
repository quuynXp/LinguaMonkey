package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.OneTimePreKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface OneTimePreKeyRepository extends JpaRepository<OneTimePreKey, OneTimePreKey.CompositeId> {

    @Query(value = "SELECT * FROM one_time_prekeys WHERE user_id = :userId ORDER BY prekey_id ASC LIMIT 1", nativeQuery = true)
    Optional<OneTimePreKey> findNextAvailablePreKey(@Param("userId") UUID userId);

    @Modifying
    @Query("DELETE FROM OneTimePreKey o WHERE o.userId = :userId AND o.preKeyId = :preKeyId")
    void deleteByUserIdAndPreKeyId(@Param("userId") UUID userId, @Param("preKeyId") int preKeyId);
    
    long countByUserId(UUID userId);
}