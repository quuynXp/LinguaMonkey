package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoadmapId;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "roadmap_favorites")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapFavorite {

    @EmbeddedId
    private UserRoadmapId id; // Composite Key (userId, roadmapId)

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roadmapId")
    @JoinColumn(name = "roadmap_id")
    private Roadmap roadmap;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}