package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ResourceResponse {
    private String type;  // VIDEO, ARTICLE, QUIZ...
    private String url;
    private String description;
}
