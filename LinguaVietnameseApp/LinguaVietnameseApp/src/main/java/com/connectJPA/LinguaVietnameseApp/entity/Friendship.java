package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.FriendshipId;
import com.connectJPA.LinguaVietnameseApp.enums.FriendshipStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

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

}
