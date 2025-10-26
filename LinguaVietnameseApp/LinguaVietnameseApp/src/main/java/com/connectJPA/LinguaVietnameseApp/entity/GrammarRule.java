package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "grammar_rules")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class GrammarRule extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "rule_id")
    private UUID ruleId;

    @Column(name = "topic_id", nullable = false)
    private UUID topicId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "explanation", length = 4000)
    private String explanation;

    @ElementCollection
    @CollectionTable(name = "grammar_rule_examples", joinColumns = @JoinColumn(name = "rule_id"))
    @Column(name = "example")
    private List<String> examples;
}
