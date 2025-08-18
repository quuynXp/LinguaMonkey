package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
public class SkillEvaluationResult {
    private Map<SkillType, Float> scores = new HashMap<>();
}
