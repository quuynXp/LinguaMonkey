package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.connectJPA.LinguaVietnameseApp.enums.TargetType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_reminders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserReminder {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "target_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private TargetType targetType; // LESSON, EXAM, STREAK, EVENT

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "title")
    private String title;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "reminder_time", nullable = false)
    private OffsetDateTime reminderTime;

    @Column(name = "reminder_date")
    private OffsetDateTime reminderDate;

    @Column(name = "repeat_type")
    @Enumerated(EnumType.STRING)
    private RepeatType repeatType; // ONCE, DAILY, WEEKLY, ALWAYS

    @Column(name = "enabled")
    private Boolean enabled = true;

    private boolean isDeleted;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
