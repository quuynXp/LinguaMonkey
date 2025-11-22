// LinguaVietnameseApp/LinguaVietnameseApp/src/main/java/com/connectJPA/LinguaVietnameseApp/entity/GrammarLesson.java
package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "grammar_lessons")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class GrammarLesson extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "lesson_id") // Dựa trên convention thường thấy, hoặc là 'id'
    private UUID lessonId;

    @Column(name = "topic_id", nullable = false)
    private UUID topicId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "content", columnDefinition = "text")
    private String content;

    @Column(name = "level")
    private String level;

    // Quan hệ 1-N với Rules
    @OneToMany(mappedBy = "grammarLesson", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GrammarRule> grammarRules;
}