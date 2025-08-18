package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.dto.AnswerDTO;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class CustomTestRequest {
    private UUID userId;
    private List<AnswerDTO> answers;
}

