package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomStatus;
import com.connectJPA.LinguaVietnameseApp.enums.RoomTopic;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "rooms")
@SuperBuilder
public class Room extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "room_id")
    private UUID roomId;

    @Column(name = "room_name", nullable = false)
    private String roomName;

    @Column(name = "course_id")
    private UUID courseId;
    
    @Column(name = "creator_id")
    private UUID creatorId;

    @Column(name = "max_members", nullable = false)
    private int maxMembers;

   @Enumerated(EnumType.STRING)
    @Column(name = "purpose")
    private RoomPurpose purpose;

   @Enumerated(EnumType.STRING)
    @Column(name = "topic")
    private RoomTopic topic;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false)
    private RoomType roomType;

    @Column(name = "room_code", length = 6, unique = true)
    private String roomCode;

    @Column(name = "password")
    private String password;

    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RoomStatus status = RoomStatus.ACTIVE;

    @Column(name = "secret_key", columnDefinition = "TEXT")
    private String secretKey;
}