package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.dto.ComprehensionQuestion;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class ReadingResponse {
    private String passage;
    private List<ComprehensionQuestion> questions;
}
