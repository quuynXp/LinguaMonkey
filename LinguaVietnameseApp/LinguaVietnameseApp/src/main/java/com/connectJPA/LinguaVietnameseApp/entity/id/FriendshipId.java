package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class FriendshipId implements Serializable {
    @Column(name = "requester_id", nullable = false)
    private UUID user1Id;

    @Column(name = "receiver_id", nullable = false)
    private UUID user2Id;
}
