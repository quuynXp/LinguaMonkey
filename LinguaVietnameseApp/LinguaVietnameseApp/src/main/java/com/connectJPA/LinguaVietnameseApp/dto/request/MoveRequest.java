package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AccessLevel;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Setter
public class MoveRequest {
    private String fromPublicId;
    private String toPublicId;
    private  Boolean overwrite;
    private  String resourceType; // "image" cho avatar
}
