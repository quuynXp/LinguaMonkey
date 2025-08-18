package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.VideoCallParticipantId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "video_call_participants")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class VideoCallParticipant extends BaseEntity {

    @EmbeddedId
    private VideoCallParticipantId id;
}
