package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface UserReminderRepository extends JpaRepository<UserReminder, UUID> {

    List<UserReminder> findByEnabledTrueAndReminderTime(OffsetDateTime time);

    List<UserReminder> findByEnabledTrueAndReminderTimeAndReminderDate(
            OffsetDateTime time, OffsetDateTime date
    );
}
