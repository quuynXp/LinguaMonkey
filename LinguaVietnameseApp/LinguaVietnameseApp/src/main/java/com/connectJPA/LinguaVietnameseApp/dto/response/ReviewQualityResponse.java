package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewQualityResponse {
    private boolean isValid;
    private boolean isToxic;
    private String sentiment;
    private List<String> topics;
    private String suggestedAction;
}