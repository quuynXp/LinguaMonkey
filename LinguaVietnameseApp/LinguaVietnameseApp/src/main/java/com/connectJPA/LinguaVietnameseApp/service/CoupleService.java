package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CoupleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CoupleResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CoupleService {
    Page<CoupleResponse> getAllCouples(UUID user1Id, String status, Pageable pageable);
    CoupleResponse getCoupleByIds(UUID user1Id, UUID user2Id);
    CoupleResponse createCouple(CoupleRequest request);
    CoupleResponse updateCouple(UUID user1Id, UUID user2Id, CoupleRequest request);
    void deleteCouple(UUID user1Id, UUID user2Id);
}