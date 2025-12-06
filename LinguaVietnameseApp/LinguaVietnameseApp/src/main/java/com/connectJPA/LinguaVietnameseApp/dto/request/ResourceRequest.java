package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceRequest {
    private String title;
    private String url;
    private String type;
    private String description;
    private Integer duration;
}