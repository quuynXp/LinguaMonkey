package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class MilestoneUserResponse {
    private UUID id;
    private String name;
    private String description;
    private boolean achieved;  // milestone đã đạt chưa
}
