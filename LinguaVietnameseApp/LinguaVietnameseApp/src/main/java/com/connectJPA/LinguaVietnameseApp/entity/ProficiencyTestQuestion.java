package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "proficiency_test_questions")
public class ProficiencyTestQuestion {

    @Id
    @UuidGenerator
    @Column(name = "question_id")
    private UUID questionId;

    @Column(name = "test_config_id", nullable = false)
    private UUID testConfigId;

    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    private String questionText;

    @Column(name = "options_json", columnDefinition = "TEXT")
    private String optionsJson;

    @Column(name = "correct_answer_index")
    private Integer correctAnswerIndex;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "skill_type")
    private String skillType; // reading, listening, grammar

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();
}