package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name="video_reactions", uniqueConstraints = @UniqueConstraint(columnNames = {"video_id","user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoReaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID videoId;
    private UUID userId;
    private Short reaction; // 1 or -1
}
