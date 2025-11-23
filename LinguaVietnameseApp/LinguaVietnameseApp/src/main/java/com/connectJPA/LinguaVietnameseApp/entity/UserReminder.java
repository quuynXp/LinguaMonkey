package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.converter.RepeatTypeConverter;
import com.connectJPA.LinguaVietnameseApp.converter.TargetTypeConverter;
import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.connectJPA.LinguaVietnameseApp.enums.TargetType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_reminders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserReminder extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "target_type", nullable = false)
    @Convert(converter = TargetTypeConverter.class)
    private TargetType targetType;

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
    @Convert(converter = RepeatTypeConverter.class)
    private RepeatType repeatType;

    @Column(name = "enabled")
    @Builder.Default
    private Boolean enabled = true;
}