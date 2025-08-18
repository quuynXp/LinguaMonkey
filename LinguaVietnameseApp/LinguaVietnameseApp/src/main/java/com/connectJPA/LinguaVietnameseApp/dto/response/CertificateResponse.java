package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Data;

import java.util.UUID;

@Data
public class CertificateResponse {
    private UUID certificateId;
    private String certificateName;
    private String languageCode;
    private String description;
}
