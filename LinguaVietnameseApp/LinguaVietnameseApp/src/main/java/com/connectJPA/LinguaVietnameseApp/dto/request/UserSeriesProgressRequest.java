package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class UserSeriesProgressRequest {
    private UUID seriesId;
    private UUID userId;
    private Integer currentIndex;
    private boolean isDeleted;
}
