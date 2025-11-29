package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateRequest {
    @NotBlank(message = "Tên chứng chỉ không được để trống")
    private String certificateName;

    @NotNull(message = "Mã ngôn ngữ không được để trống")
    private String languageCode;

    private String description;
}
