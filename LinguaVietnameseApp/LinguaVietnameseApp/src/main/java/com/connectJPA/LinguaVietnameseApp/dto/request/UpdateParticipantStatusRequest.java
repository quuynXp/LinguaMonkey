package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.VideoCallParticipantStatus;
import lombok.Data;

@Data
public class UpdateParticipantStatusRequest {
    private VideoCallParticipantStatus status;
}