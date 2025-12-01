package com.connectJPA.LinguaVietnameseApp.dto.response;

import java.util.List;
import java.util.UUID;

import lombok.*;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LessonHierarchicalResponse {
    private UUID categoryId;
    private String categoryName;
    private Integer coinReward;
    private List<SubCategoryDto> subCategories;
    
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SubCategoryDto {
        private UUID subCategoryId;
        private String subCategoryName;
        private List<LessonResponse> lessons;
    }
}
