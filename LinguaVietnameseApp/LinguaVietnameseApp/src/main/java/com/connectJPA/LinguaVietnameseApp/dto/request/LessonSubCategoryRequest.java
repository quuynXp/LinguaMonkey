package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class LessonSubCategoryRequest {
    private UUID lessonSubCategoryId;
    private String lessonSubCategoryName;
    private UUID lessonCategoryId;
    private boolean isDeleted;
}
