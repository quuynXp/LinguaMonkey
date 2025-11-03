package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class UpdateCourseVersionRequest {
    private String description;
    private String thumbnailUrl;

    @NotEmpty(message = "A course version must have at least one lesson.")
    private List<UUID> lessonIds;
}