package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.connectJPA.LinguaVietnameseApp.enums.TargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserReminderRequest {
    @Size(max = 255)
    private String title;

    @Size(max = 1024)
    private String message;

    @NotBlank(message = "Reminder time (HH:mm) is required.")
    @Pattern(regexp = "^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$", message = "Reminder time must be in HH:mm format.")
    private String time;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Reminder date must be in YYYY-MM-DD format.")
    private String date;

    @NotNull(message = "Repeat type is required.")
    private RepeatType repeatType;

    private TargetType targetType;

    private String targetId;

    private Boolean enabled;
}