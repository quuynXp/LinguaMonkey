package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.dto.ParticipantInfo;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoCallResponse {

    private UUID videoCallId;
    private UUID roomId;
    private UUID callerId;
    private UUID calleeId; // null nếu là group call
    private VideoCallType videoCallType;
    private VideoCallStatus status;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private String duration;
    private String qualityMetrics;

    private List<ParticipantInfo> participants;


}
