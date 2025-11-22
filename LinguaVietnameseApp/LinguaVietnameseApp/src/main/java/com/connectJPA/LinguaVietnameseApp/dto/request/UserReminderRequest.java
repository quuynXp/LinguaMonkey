package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.connectJPA.LinguaVietnameseApp.enums.TargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserReminderRequest {
    @Size(max = 255)
    private String title;

    @Size(max = 1024)
    private String message;

    @NotBlank(message = "Reminder time (HH:mm) is required.")
    @Pattern(regexp = "^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$", message = "Reminder time must be in HH:mm format.")
    private String time; // Giờ và phút

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Reminder date must be in YYYY-MM-DD format.")
    private String date; // Ngày (Optional)

    @NotBlank(message = "Repeat type is required.")
    private RepeatType repeatType; // e.g., ONCE, DAILY, WEEKLY, ALWAYS

    @NotBlank(message = "Target type is required.")
    private TargetType targetType; // e.g., LESSON, EXAM, STREAK, EVENT

    private String targetId; // UUID dưới dạng String

    private Boolean enabled;
}