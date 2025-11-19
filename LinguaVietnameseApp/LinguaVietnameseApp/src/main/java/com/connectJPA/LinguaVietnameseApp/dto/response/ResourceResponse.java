package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceResponse {
    private String type;
    private String url;
    private String description;
    private String title;
    private Integer duration;
}
