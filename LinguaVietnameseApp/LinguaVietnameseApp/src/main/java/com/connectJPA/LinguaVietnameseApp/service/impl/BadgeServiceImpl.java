package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.BadgeMapper;
import com.connectJPA.LinguaVietnameseApp.repository.BadgeRepository;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataAccessException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BadgeServiceImpl implements BadgeService {
    private final BadgeRepository badgeRepository;
    private final BadgeMapper badgeMapper;

    @Override
    @Cacheable(value = "badges", key = "#badgeName + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<BadgeResponse> getAllBadges(String badgeName, Pageable pageable) {
        try {
            Page<Badge> badges = badgeRepository.findByBadgeNameContainingAndIsDeletedFalse(badgeName, pageable);
            return badges.map(badgeMapper::toResponse);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "badges", key = "#id")
    public BadgeResponse getBadgeById(UUID id) {
        try {
            Badge badge = badgeRepository.findByBadgeIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
            return badgeMapper.toResponse(badge);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "badges", key = "#result.badgeId")
    public BadgeResponse createBadge(BadgeRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Badge badge = badgeMapper.toEntity(request);
            badge.setDeleted(false);
            badge = badgeRepository.save(badge);
            return badgeMapper.toResponse(badge);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "badges", key = "#id")
    @CacheEvict(value = "badges", allEntries = true)
    public BadgeResponse updateBadge(UUID id, BadgeRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Badge badge = badgeRepository.findByBadgeIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
            badgeMapper.updateEntityFromRequest(request, badge);
            badge = badgeRepository.save(badge);
            return badgeMapper.toResponse(badge);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "badges", key = "#id", allEntries = true)
    public void deleteBadge(UUID id) {
        try {
            Badge badge = badgeRepository.findByBadgeIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
            badge.setDeleted(true);
            badgeRepository.save(badge);
            badgeRepository.softDeleteBadgeByBadgeId(id);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}