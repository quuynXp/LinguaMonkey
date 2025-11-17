package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PublishVersionRequest {
    @NotBlank(message = "Reason for change is required")
    private String reasonForChange;
}