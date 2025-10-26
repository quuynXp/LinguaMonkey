package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GrammarProgressId implements Serializable {
    private UUID topicId;
    private UUID userId;
    private UUID ruleId;
}
