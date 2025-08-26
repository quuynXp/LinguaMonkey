package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Data;

@Data
public class ActivityCountResponse {
    private String activityType;
    private String period;
    private long count;
}