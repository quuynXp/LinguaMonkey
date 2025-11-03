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
public class Friendship extends BaseEntity {
    @EmbeddedId
    private FriendshipId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FriendshipStatus status = FriendshipStatus.ACCEPTED;

    public UUID getSenderId() {
        return this.id.getUser1Id();
    }

}
