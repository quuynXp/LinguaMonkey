package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class EmailRequest {
    private String to;
    private String subject;
    private String templateCode; // e.g., REGISTER_SUCCESS, COURSE_PURCHASED
    private Map<String, String> params; // e.g., name, courseName
    private String language; // "en", "vi"
}