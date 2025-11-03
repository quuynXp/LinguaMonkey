package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "test_sessions")
public class TestSession {

    @Id
    @UuidGenerator
    @Column(name = "test_session_id")
    private UUID testSessionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "test_config_id", nullable = false)
    private UUID testConfigId;

    @Column(name = "status", nullable = false)
    private String status; // PENDING, COMPLETED

    @Column(name = "started_at")
    private OffsetDateTime startedAt = OffsetDateTime.now();

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "score")
    private Integer score;

    @Column(name = "percentage")
    private Double percentage;

    @Column(name = "proficiency_estimate")
    private String proficiencyEstimate; // "B1"

    // Liên kết
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_config_id", insertable = false, updatable = false)
    private ProficiencyTestConfig testConfig;
}