package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name="review_reactions", uniqueConstraints = @UniqueConstraint(columnNames = {"review_id","user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID reviewId;
    private UUID userId;
    private Short reaction;
}
