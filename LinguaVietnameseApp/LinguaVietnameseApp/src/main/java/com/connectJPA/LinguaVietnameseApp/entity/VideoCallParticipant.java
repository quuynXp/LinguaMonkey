package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.VideoCallParticipantId;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallParticipantStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallRole;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Entity
@Table(name = "video_call_participants")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class VideoCallParticipant extends BaseEntity {

    @EmbeddedId
    private VideoCallParticipantId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false) // Chỉ để query
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_call_id", insertable = false, updatable = false) // Chỉ để query
    private VideoCall videoCall;

    @Column(name = "joined_at")
    private OffsetDateTime joinedAt;

    @Column(name = "left_at")
    private OffsetDateTime leftAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private VideoCallRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private VideoCallParticipantStatus status;

}
