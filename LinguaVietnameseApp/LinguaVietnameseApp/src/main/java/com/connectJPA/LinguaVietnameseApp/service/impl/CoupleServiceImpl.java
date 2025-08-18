package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CoupleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CoupleResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Couple;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CoupleMapper;
import com.connectJPA.LinguaVietnameseApp.repository.CoupleRepository;
import com.connectJPA.LinguaVietnameseApp.service.CoupleService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoupleServiceImpl implements CoupleService {
    private final CoupleRepository coupleRepository;
    private final CoupleMapper coupleMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    @Cacheable(value = "couples", key = "#user1Id + ':' + #status + ':' + #pageable")
    public Page<CoupleResponse> getAllCouples(UUID user1Id, String status, Pageable pageable) {
        try {
            Page<Couple> couples = coupleRepository.findAllByIdUser1IdAndStatusAndIsDeletedFalse(user1Id, status, pageable);
            return couples.map(coupleMapper::toResponse);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "couple", key = "#user1Id + ':' + #user2Id")
    public CoupleResponse getCoupleByIds(UUID user1Id, UUID user2Id) {
        try {
            Couple couple = coupleRepository.findByIdUser1IdAndIdUser2IdAndIsDeletedFalse(user1Id, user2Id)
                    .orElseThrow(() -> new AppException(ErrorCode.COUPLE_NOT_FOUND));
            return coupleMapper.toResponse(couple);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"couples"}, allEntries = true)
    public CoupleResponse createCouple(CoupleRequest request) {
        try {
            Couple couple = coupleMapper.toEntity(request);
            couple = coupleRepository.save(couple);
            return coupleMapper.toResponse(couple);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "couple", key = "#user1Id + ':' + #user2Id")
    public CoupleResponse updateCouple(UUID user1Id, UUID user2Id, CoupleRequest request) {
        try {
            Couple couple = coupleRepository.findByIdUser1IdAndIdUser2IdAndIsDeletedFalse(user1Id, user2Id)
                    .orElseThrow(() -> new AppException(ErrorCode.COUPLE_NOT_FOUND));
            coupleMapper.updateEntityFromRequest(request, couple);
            couple = coupleRepository.save(couple);
            return coupleMapper.toResponse(couple);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "couple", key = "#user1Id + ':' + #user2Id")
    public void deleteCouple(UUID user1Id, UUID user2Id) {
        try {
            Couple couple = coupleRepository.findByIdUser1IdAndIdUser2IdAndIsDeletedFalse(user1Id, user2Id)
                    .orElseThrow(() -> new AppException(ErrorCode.COUPLE_NOT_FOUND));
            couple.setDeleted(true);
            coupleRepository.save(couple);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}