package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
public class CourseProgressDto {
    private UUID courseId;
    private String courseTitle;
    private String courseImageUrl;
    private int totalLessons;
    private int completedLessons;
}
