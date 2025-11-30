package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.FriendshipId;
import com.connectJPA.LinguaVietnameseApp.enums.FriendshipStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "friendships")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
// Bổ sung các mối quan hệ ManyToOne để MapStruct có thể truy cập User entity
@EqualsAndHashCode(callSuper = true)
public class Friendship extends BaseEntity {
    @EmbeddedId
    private FriendshipId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FriendshipStatus status = FriendshipStatus.ACCEPTED;

    // --- NEW MAPPING FIELDS ---

    @ManyToOne
    @MapsId("requesterId") // Map trường này với requesterId trong EmbeddedId
    @JoinColumn(name = "user1_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    private User requester;

    @ManyToOne
    @MapsId("receiverId") // Map trường này với receiverId trong EmbeddedId
    @JoinColumn(name = "user2_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    private User receiver;

    // --------------------------

    public UUID getRequesterId() {
        return this.id.getRequesterId();
    }
}