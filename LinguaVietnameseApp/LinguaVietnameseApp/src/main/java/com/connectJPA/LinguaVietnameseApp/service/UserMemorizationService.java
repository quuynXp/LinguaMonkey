package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.MemorizationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemorizationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserMemorizationService {
    MemorizationResponse saveMemorization(MemorizationRequest request, UUID authenticatedUserId);
    MemorizationResponse updateMemorization(UUID memorizationId, MemorizationRequest request, UUID authenticatedUserId);
    void deleteMemorization(UUID memorizationId, UUID authenticatedUserId);
    Page<MemorizationResponse> getMemorizationsByUser(UUID userId, String contentType, Pageable pageable);
}