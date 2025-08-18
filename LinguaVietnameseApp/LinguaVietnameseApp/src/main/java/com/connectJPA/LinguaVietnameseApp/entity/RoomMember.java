package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import com.connectJPA.LinguaVietnameseApp.enums.RoomRole;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Entity
@Data
@SuperBuilder
@Table(name = "room_members")
@AllArgsConstructor
@NoArgsConstructor
public class RoomMember extends BaseEntity {
    @EmbeddedId
    private RoomMemberId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private RoomRole role;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    @Column(name = "end_at")
    private OffsetDateTime endAt;
}
