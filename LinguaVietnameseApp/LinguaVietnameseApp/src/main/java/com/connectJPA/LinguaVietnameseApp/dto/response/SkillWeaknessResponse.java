package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import lombok.*;

@Data
@AllArgsConstructor
public class SkillWeaknessResponse {
    private SkillType skill;
    private int wrongCount;
}
