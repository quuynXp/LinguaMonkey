package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@SuperBuilder
@Table(name = "admirations")
@Entity
@AllArgsConstructor
@NoArgsConstructor
public class Admiration {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID admirationId;

    private UUID userId;
    private UUID senderId;
    private OffsetDateTime createdAt = OffsetDateTime.now();

}
