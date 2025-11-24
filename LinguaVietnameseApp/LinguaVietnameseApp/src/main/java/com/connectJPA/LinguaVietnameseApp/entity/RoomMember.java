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

    // SỬA: Khai báo rõ ràng cột foreign key
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roomId") // Maps trường 'roomId' trong RoomMemberId
    @JoinColumn(name = "room_id") 
    private Room room;

    // SỬA: Khai báo rõ ràng cột foreign key
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId") // Maps trường 'userId' trong RoomMemberId
    @JoinColumn(name = "user_id") 
    private User user;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    @Column(name = "end_at")
    private OffsetDateTime endAt;

    @Column(name = "is_admin") 
    private boolean isAdmin; 

    @Column(name = "nick_name_in_rom") 
    private String nickNameInRom;
}