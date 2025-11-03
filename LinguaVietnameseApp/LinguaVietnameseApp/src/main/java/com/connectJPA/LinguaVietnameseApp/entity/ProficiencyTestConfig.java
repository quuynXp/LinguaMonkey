package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "proficiency_test_configs")
public class ProficiencyTestConfig {

    @Id
    @UuidGenerator
    @Column(name = "test_config_id")
    private UUID testConfigId;

    @Column(name = "test_type", nullable = false)
    private String testType; // "PLACEMENT_TEST", "SKILL_TEST", "GRAMMAR"

    @Column(name = "language_code", nullable = false)
    private String languageCode;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "num_questions", nullable = false)
    private Integer numQuestions = 15;

    @Column(name = "ai_topic")
    private String aiTopic; // "placement_a2", "grammar_b1_tenses"

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    // Liên kết tới bảng Language (nếu cần)
    // @ManyToOne(fetch = FetchType.LAZY)
    // @JoinColumn(name = "language_code", referencedColumnName = "language_code", insertable = false, updatable = false)
    // private Language language;
}