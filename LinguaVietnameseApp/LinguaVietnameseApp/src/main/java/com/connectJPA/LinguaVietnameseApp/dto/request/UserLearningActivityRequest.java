package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Data;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class UserLearningActivityRequest {
    private UUID userId;
    private String activityType;
    private String duration;
}