package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import com.connectJPA.LinguaVietnameseApp.enums.RoomRole;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roomId") 
    @JoinColumn(name = "room_id") 
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId") 
    @JoinColumn(name = "user_id") 
    private User user;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    @Column(name = "end_at")
    private OffsetDateTime endAt;

    @Column(name = "is_admin") 
    private Boolean isAdmin = false; 

    @Column(name = "nick_name_in_rom") 
    private String nickNameInRom;
}