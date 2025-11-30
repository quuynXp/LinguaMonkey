package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CoupleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CoupleResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Couple;
import com.connectJPA.LinguaVietnameseApp.entity.CoupleProfileSummary;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.CoupleStatus;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CoupleMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CoupleRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.CoupleService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoupleServiceImpl implements CoupleService {
    private final CoupleRepository coupleRepository;
    private final UserRepository userRepository; 
    private final CoupleMapper coupleMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
public Page<CoupleResponse> getAllCouples(UUID user1Id, String statusString, Pageable pageable) {
    CoupleStatus statusEnum = null;
    if (statusString != null && !statusString.isEmpty()) {
        try {
            statusEnum = CoupleStatus.valueOf(statusString.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_INPUT); 
        }
    }
    
    if (statusEnum != null) {
        Page<Couple> couples = coupleRepository.findAllByUser1_UserIdAndStatusAndIsDeletedFalse(user1Id, statusEnum, pageable);
        return couples.map(coupleMapper::toResponse);
    } else {
        throw new AppException(ErrorCode.INVALID_INPUT);
    }
}

    @Override
    public CoupleResponse getCoupleByIds(UUID user1Id, UUID user2Id) {
        // Giả sử findByUser1_UserIdAndUser2_UserIdAndIsDeletedFalse có sử dụng JOIN FETCH
        Couple couple = coupleRepository.findByUser1_UserIdAndUser2_UserIdAndIsDeletedFalse(user1Id, user2Id)
                .orElseThrow(() -> new AppException(ErrorCode.COUPLE_NOT_FOUND));
        return coupleMapper.toResponse(couple);
    }

    @Override
    @Transactional
    //@CacheEvict(value = {"couples"}, allEntries = true)
    public CoupleResponse createCouple(CoupleRequest request) {
        User u1 = userRepository.findById(request.getUser1Id())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        User u2 = userRepository.findById(request.getUser2Id())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Couple couple = coupleMapper.toEntity(request);
        couple.setUser1(u1);
        couple.setUser2(u2);
        couple = coupleRepository.save(couple);
        return coupleMapper.toResponse(couple);
    }

    @Override
    @Transactional
    //@CachePut(value = "couple", key = "#user1Id + ':' + #user2Id")
    public CoupleResponse updateCouple(UUID user1Id, UUID user2Id, CoupleRequest request) {
        Couple couple = coupleRepository.findByUser1_UserIdAndUser2_UserIdAndIsDeletedFalse(user1Id, user2Id)
                .orElseThrow(() -> new AppException(ErrorCode.COUPLE_NOT_FOUND));
        coupleMapper.updateEntityFromRequest(request, couple);
        
        if (request.getUser1Id() != null && !request.getUser1Id().equals(user1Id)) {
            User newU1 = userRepository.findByUserIdAndIsDeletedFalse(request.getUser1Id()).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            couple.setUser1(newU1);
        }
        if (request.getUser2Id() != null && !request.getUser2Id().equals(user2Id)) {
            User newU2 = userRepository.findByUserIdAndIsDeletedFalse(request.getUser2Id()).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            couple.setUser2(newU2);
        }
        couple = coupleRepository.save(couple);
        return coupleMapper.toResponse(couple);
    }

    @Override
    @Transactional
    //@CacheEvict(value = "couple", key = "#user1Id + ':' + #user2Id")
    public void deleteCouple(UUID user1Id, UUID user2Id) {
        Couple couple = coupleRepository.findByUser1_UserIdAndUser2_UserIdAndIsDeletedFalse(user1Id, user2Id)
                .orElseThrow(() -> new AppException(ErrorCode.COUPLE_NOT_FOUND));
        couple.setDeleted(true);
        coupleRepository.save(couple);
    }

    @Override
    public CoupleProfileSummary getCoupleProfileSummaryByUser(UUID userId, UUID viewerId) {
        return coupleRepository.findByUserId(userId)
                .map(c -> CoupleProfileSummary.builder()
                        .coupleId(c.getId())
                        // Lấy partner là người còn lại
                        .partnerId(c.getUser1().getUserId().equals(userId) ? c.getUser2().getUserId() : c.getUser1().getUserId())
                        .status(c.getStatus())
                        .build())
                .orElse(null);
    }

    @Override
    public Couple findById(UUID coupleId) {
        return coupleRepository.findById(coupleId).orElse(null);
    }
}