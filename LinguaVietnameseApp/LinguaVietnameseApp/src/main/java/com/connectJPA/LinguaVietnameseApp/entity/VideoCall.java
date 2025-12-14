package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.ColumnTransformer;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Table(name = "video_calls")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class VideoCall extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "video_call_id")
    private UUID videoCallId;

    @Column(name = "room_id")
    private UUID roomId;

    @Column(name = "caller_id", nullable = false)
    private UUID callerId;

    @Column(name = "callee_id", nullable = true)
    private UUID calleeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "video_call_type")
    private VideoCallType videoCallType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private VideoCallStatus status = VideoCallStatus.INITIATED;

    @Column(name = "start_time")
    private OffsetDateTime startTime;

    @Column(name = "end_time")
    private OffsetDateTime endTime;

    @Column(name = "duration", insertable = false, updatable = false)
    private String duration;

    @Column(name = "quality_metrics", columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String qualityMetrics;
    // -------------------------------------------------------------------------------------------------

    @OneToMany(mappedBy = "videoCall", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @ToString.Exclude
    private List<VideoCallParticipant> participants;
}