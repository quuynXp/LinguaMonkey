package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PronunciationResponseBody {
    private String feedback;
    private float score;
}
