package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.converter.RoomPurposeConverter;
import com.connectJPA.LinguaVietnameseApp.converter.RoomStatusConverter;
import com.connectJPA.LinguaVietnameseApp.converter.RoomTopicConverter;
import com.connectJPA.LinguaVietnameseApp.converter.RoomTypeConverter;
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

    @Convert(converter = RoomPurposeConverter.class)
    @Column(name = "purpose")
    private RoomPurpose purpose;

    @Convert(converter = RoomTopicConverter.class)
    @Column(name = "topic")
    private RoomTopic topic;

    @Convert(converter = RoomTypeConverter.class)
    @Column(name = "room_type", nullable = false)
    private RoomType roomType;

    @Column(name = "room_code", length = 6, unique = true)
    private String roomCode;

    @Column(name = "password")
    private String password;

    private String content;

    @Convert(converter = RoomStatusConverter.class)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RoomStatus status = RoomStatus.ACTIVE;
}