package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SkillProgressResponse {
    private LocalDate date;
    private float score;
}
