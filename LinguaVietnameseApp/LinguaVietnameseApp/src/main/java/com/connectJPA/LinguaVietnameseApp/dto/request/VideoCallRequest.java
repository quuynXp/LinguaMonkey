package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import com.connectJPA.LinguaVietnameseApp.enums.VideoCallStatus;

@Setter
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VideoCallRequest {
    private UUID callerId;
    private VideoCallStatus status;
}
