package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Admiration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.UUID;

@Repository
public interface AdmirationRepository extends JpaRepository<Admiration, UUID> {
    
    // For Badge (Lifetime - Received)
    long countByUserId(UUID userId);
    
    // For Badge (Lifetime - Given "Trái tim vàng")
    long countBySenderId(UUID senderId);

    boolean existsByUserIdAndSenderId(UUID userId, UUID senderId);

    // For Daily Challenge (Today - Given "Thả tim ngưỡng mộ")
    @Query("SELECT COUNT(a) FROM Admiration a WHERE a.senderId = :senderId AND a.createdAt BETWEEN :start AND :end")
    long countBySenderIdAndCreatedAtBetween(@Param("senderId") UUID senderId, 
                                            @Param("start") OffsetDateTime start, 
                                            @Param("end") OffsetDateTime end);
}