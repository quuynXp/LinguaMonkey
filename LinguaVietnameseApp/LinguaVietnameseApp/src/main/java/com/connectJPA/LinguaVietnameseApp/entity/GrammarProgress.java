package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.GrammarProgressId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;

@Entity
@Table(name = "grammar_progress")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class GrammarProgress extends BaseEntity {
    @EmbeddedId
    private GrammarProgressId id;

    @Column(name = "score")
    private Integer score;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}
