package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceResponse {
    private UUID id;
    private String type;
    private String url;
    private String description;
    private String title;
    private Integer duration;
}