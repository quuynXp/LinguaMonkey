package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "roadmap_suggestions")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class RoadmapSuggestion {
    @Id
    @GeneratedValue
    private UUID suggestionId;
    @ManyToOne
    private User user; // Người góp ý
    @ManyToOne
    private Roadmap roadmap; // Roadmap được góp ý
    private UUID itemId; // Item cụ thể (optional)
    private Integer suggestedOrderIndex; // Vị trí gợi ý (orderIndex mới)
    private String reason; // Lý do chỉnh sửa
    private OffsetDateTime createdAt = OffsetDateTime.now();
    private boolean applied = false; // Đã áp dụng chưa
}
