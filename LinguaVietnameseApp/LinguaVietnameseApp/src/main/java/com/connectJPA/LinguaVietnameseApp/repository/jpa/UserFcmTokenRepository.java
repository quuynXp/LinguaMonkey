package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserFcmToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserFcmTokenRepository extends JpaRepository<UserFcmToken, UUID> {
    @Query("SELECT t.fcmToken FROM UserFcmToken t WHERE t.userId = :userId")
    List<String> findFcmTokensByUserId(@Param("userId") UUID userId);

    Optional<UserFcmToken> findByFcmToken(String fcmToken);
    
    List<UserFcmToken> findByUserIdAndIsDeletedFalse(UUID userId);

    Optional<UserFcmToken> findByUserIdAndDeviceId(UUID userId, String deviceId);

}
