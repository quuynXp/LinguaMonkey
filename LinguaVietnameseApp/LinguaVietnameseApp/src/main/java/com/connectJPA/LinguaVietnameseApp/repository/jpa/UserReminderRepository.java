package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserReminderRepository extends JpaRepository<UserReminder, UUID> {

    // Phương thức sử dụng trong LearningContentScheduler
    List<UserReminder> findByReminderTimeBeforeAndEnabledTrueAndIsDeletedFalse(OffsetDateTime time);

    // Phương thức sử dụng trong ReminderServiceImpl
    List<UserReminder> findByEnabledTrueAndReminderTime(OffsetDateTime time);

    // Phương thức tìm kiếm theo User ID và Reminder ID
    Optional<UserReminder> findByIdAndUserIdAndIsDeletedFalse(UUID id, UUID userId);

    // Phương thức phân trang cho user
    Page<UserReminder> findByUserIdAndIsDeletedFalse(UUID userId, Pageable pageable);

    // Phương thức phân trang cho user có lọc theo enabled
    Page<UserReminder> findByUserIdAndEnabledAndIsDeletedFalse(UUID userId, Boolean enabled, Pageable pageable);


    @Query(value = "SELECT * FROM user_reminders ur " +
           "WHERE ur.enabled = true " +
           "AND ur.is_deleted = false " +
           "AND (" +
           "  (ur.repeat_type = 'ONCE' AND ur.reminder_time BETWEEN :start AND :end) " +
           "  OR " +
           "  (ur.repeat_type = 'DAILY' AND CAST(ur.reminder_time AS TIME) BETWEEN CAST(:start AS TIME) AND CAST(:end AS TIME)) " +
           ")", nativeQuery = true)
    List<UserReminder> findDueReminders(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

}