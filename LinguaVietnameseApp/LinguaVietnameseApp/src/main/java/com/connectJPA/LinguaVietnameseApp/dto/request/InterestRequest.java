package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Data;
import lombok.Getter;

@Getter
@Builder
public class InterestRequest {
    private String interestName;
    private String description;
    private String icon;
    private String color;
}