package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "grammar_exercises")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class GrammarExercise extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "exercise_id")
    private UUID exerciseId;

    @Column(name = "rule_id", nullable = false)
    private UUID ruleId;

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "question", length = 2000)
    private String question;

    @ElementCollection
    @CollectionTable(name = "grammar_exercise_options", joinColumns = @JoinColumn(name = "exercise_id"))
    @Column(name = "option_text")
    private List<String> options;

    @Column(name = "correct_answer", length = 2000)
    private String correct;

    @Column(name = "explanation", length = 2000)
    private String explanation;
}
