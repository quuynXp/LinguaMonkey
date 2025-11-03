package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateCourseRequest {
    @NotNull
    private UUID creatorId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotNull
    private BigDecimal price;

}