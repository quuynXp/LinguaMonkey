package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.EventType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@SuperBuilder
@Entity
@AllArgsConstructor
@Table(name = "events")
@NoArgsConstructor
public class Event extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID eventId;

    private String eventName;
    private String description;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;

    @Enumerated(EnumType.STRING)
    private EventType eventType;

    private int maxScore;
}
