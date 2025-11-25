package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class FriendshipId implements Serializable {
    @Column(name = "user1_id", nullable = false)
    private UUID requesterId;

    @Column(name = "user2_id", nullable = false)
    private UUID receiverId;
}