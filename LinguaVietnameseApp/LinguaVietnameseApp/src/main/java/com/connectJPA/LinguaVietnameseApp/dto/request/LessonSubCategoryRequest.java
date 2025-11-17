package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.*;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonSubCategoryRequest {
    private UUID lessonSubCategoryId;
    private String lessonSubCategoryName;
    private UUID lessonCategoryId;
    private boolean isDeleted;
}
