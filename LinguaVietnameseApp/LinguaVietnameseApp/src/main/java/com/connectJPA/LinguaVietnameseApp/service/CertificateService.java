package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CertificateRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CertificateResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CertificateService {
    Page<CertificateResponse> getAllCertificates(Pageable pageable);
    CertificateResponse getCertificateById(UUID id);
    CertificateResponse createCertificate(CertificateRequest request);
    CertificateResponse updateCertificate(UUID id, CertificateRequest request);
    void deleteCertificate(UUID id);
}