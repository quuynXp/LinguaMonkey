package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class StudyHistoryResponse {
    private List<StudySessionResponse> sessions;
    private StatsResponse stats;
}
