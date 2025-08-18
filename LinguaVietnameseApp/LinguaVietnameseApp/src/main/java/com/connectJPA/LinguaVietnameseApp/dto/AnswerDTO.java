package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AnswerDTO {
    private UUID questionId;
    private String selectedOption;
}

