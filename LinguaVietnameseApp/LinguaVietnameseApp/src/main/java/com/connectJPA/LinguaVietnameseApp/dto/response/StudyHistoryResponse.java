package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyHistoryResponse {
    private List<StudySessionResponse> sessions;
    private StatsResponse stats;
    private Map<String, Integer> dailyActivity;
}