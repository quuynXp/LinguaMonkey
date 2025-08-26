package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Data
@Entity
@Table(name = "roadmap_resources")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class RoadmapResource extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID resourceId;

    private UUID itemId;
    private String type;
    private String title;
    private String description;
    private String url;
    private UUID contentId;
    private Integer duration;
}
