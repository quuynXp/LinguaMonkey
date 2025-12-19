package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND n.title LIKE %:title% AND n.type = :type AND n.isDeleted = false")
    Page<Notification> findByUserIdAndTitleContainingAndTypeAndIsDeletedFalse(
            @Param("userId") UUID userId, @Param("title") String title, @Param("type") String type, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND n.isDeleted = false ORDER BY n.createdAt DESC")
    Page<Notification> findByUserIdAndIsDeletedFalse(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.notificationId = :id AND n.isDeleted = false")
    Optional<Notification> findByNotificationIdAndIsDeletedFalse(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE Notification n SET n.isDeleted = true, n.deletedAt = CURRENT_TIMESTAMP WHERE n.notificationId = :id AND n.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    @Query("SELECT n FROM Notification n WHERE " +
            "n.userId = :userId AND " +
            "(LOWER(n.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(CAST(n.content AS string)) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
            "n.isDeleted = false " +
            "ORDER BY n.createdAt DESC")
    Page<Notification> searchNotificationsByKeyword(
            @Param("userId") UUID userId,
            @Param("keyword") String keyword,
            Pageable pageable);

    long countByUserIdAndReadFalseAndIsDeletedFalse(UUID userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false AND n.isDeleted = false")
    void markAllAsReadByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isDeleted = true, n.deletedAt = CURRENT_TIMESTAMP WHERE n.userId = :userId AND n.isDeleted = false")
    void deleteAllByUserId(@Param("userId") UUID userId);
}