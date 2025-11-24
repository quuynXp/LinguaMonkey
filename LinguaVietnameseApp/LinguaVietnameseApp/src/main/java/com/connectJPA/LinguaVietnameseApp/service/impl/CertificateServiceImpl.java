package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CertificateRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CertificateResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonCategory;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.CertificateMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonCategoryRepository;
import com.connectJPA.LinguaVietnameseApp.service.CertificateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CertificateServiceImpl implements CertificateService {
    private final LessonCategoryRepository lessonCategoryRepository;
    private final CertificateMapper certificateMapper;

    @Override
    //@Cacheable(value = "certificates", key = "#pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<CertificateResponse> getAllCertificates(Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<LessonCategory> certificates = lessonCategoryRepository.findAllCertificates(pageable);
            return certificates.map(certificateMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all certificates: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    //@Cacheable(value = "certificates", key = "#id")
    public CertificateResponse getCertificateById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonCategory certificate = lessonCategoryRepository.findCertificateById(id)
                    .orElseThrow(() -> new AppException(ErrorCode.CERTIFICATE_NOT_FOUND));
            return certificateMapper.toResponse(certificate);
        } catch (Exception e) {
            log.error("Error while fetching certificate by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CachePut(value = "certificates", key = "#result.certificateId")
    public CertificateResponse createCertificate(CertificateRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LessonCategory certificate = certificateMapper.toEntity(request);
            certificate.setLessonCategoryName("CERTIFICATE"); // Ensure the type is set to CERTIFICATE (corrected from lessonCategoryName)
            certificate = lessonCategoryRepository.save(certificate);
            return certificateMapper.toResponse(certificate);
        } catch (Exception e) {
            log.error("Error while creating certificate: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CachePut(value = "certificates", key = "#id")
    public CertificateResponse updateCertificate(UUID id, CertificateRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonCategory certificate = lessonCategoryRepository.findCertificateById(id)
                    .orElseThrow(() -> new AppException(ErrorCode.CERTIFICATE_NOT_FOUND));
            certificateMapper.updateEntityFromRequest(request, certificate);
            certificate = lessonCategoryRepository.save(certificate);
            return certificateMapper.toResponse(certificate);
        } catch (Exception e) {
            log.error("Error while updating certificate ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CacheEvict(value = "certificates", key = "#id")
    public void deleteCertificate(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonCategory certificate = lessonCategoryRepository.findCertificateById(id)
                    .orElseThrow(() -> new AppException(ErrorCode.CERTIFICATE_NOT_FOUND));
            lessonCategoryRepository.softDeleteCertificateById(id);
        } catch (Exception e) {
            log.error("Error while deleting certificate ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}