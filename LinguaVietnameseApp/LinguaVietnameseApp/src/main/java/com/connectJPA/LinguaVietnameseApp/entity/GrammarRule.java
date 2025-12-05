package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
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

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false, referencedColumnName = "lesson_id") // <--- THÊM referencedColumnName
    private GrammarLesson grammarLesson;

    @Column(name = "title")
    private String title;

    @Column(name = "rule_content", columnDefinition = "text")
    private String ruleContent;

    @Column(name = "usage_notes", columnDefinition = "text")
    private String usageNotes;

    @ElementCollection
    @CollectionTable(name = "grammar_rule_examples", joinColumns = @JoinColumn(name = "rule_id"))
    @Column(name = "example")
    private List<String> examples;
}