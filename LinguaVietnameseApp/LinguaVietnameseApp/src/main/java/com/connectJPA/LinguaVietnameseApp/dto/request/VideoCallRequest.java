package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VideoCallRequest {
    private String callerId;
}
