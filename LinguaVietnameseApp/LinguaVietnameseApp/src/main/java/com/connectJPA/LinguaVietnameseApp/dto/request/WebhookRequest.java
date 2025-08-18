package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class WebhookRequest {
    private String provider;
    private Map<String, String> payload;
}