package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "roadmaps")
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Roadmap extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID roadmapId;

    private String languageCode;
    private String title;
    private String description;
    private Integer totalItems;
}

