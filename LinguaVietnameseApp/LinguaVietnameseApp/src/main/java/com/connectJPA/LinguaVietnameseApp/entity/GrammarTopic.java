package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "grammar_topics")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class GrammarTopic extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "topic_id")
    private UUID topicId;

    @Column(name = "topic_name", nullable = false)
    private String topicName;

    @Column(name = "language_code")
    private String languageCode;

    @Column(name = "description", length = 2000)
    private String description;
}
