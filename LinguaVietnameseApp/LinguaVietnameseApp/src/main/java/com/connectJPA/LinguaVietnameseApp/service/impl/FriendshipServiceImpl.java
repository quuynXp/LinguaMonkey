package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.FriendshipRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendshipResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Friendship;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.FriendshipMapper;
import com.connectJPA.LinguaVietnameseApp.repository.FriendshipRepository;
import com.connectJPA.LinguaVietnameseApp.service.FriendshipService;
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
public class FriendshipServiceImpl implements FriendshipService {
    private final FriendshipRepository friendshipRepository;
    private final FriendshipMapper friendshipMapper;

    @Override
    @Cacheable(value = "friendships", key = "#user1Id + ':' + #status + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<FriendshipResponse> getAllFriendships(String user1Id, String status, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID user1Uuid = (user1Id != null) ? UUID.fromString(user1Id) : null;
            Page<Friendship> friendships = friendshipRepository.findByIdUser1IdAndStatusAndIsDeletedFalse(user1Uuid, status, pageable);
            return friendships.map(friendshipMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all friendships: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "friendships", key = "#user1Id + ':' + #user2Id")
    public FriendshipResponse getFriendshipByIds(UUID user1Id, UUID user2Id) {
        try {
            if (user1Id == null || user2Id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Friendship friendship = friendshipRepository.findByIdUser1IdAndIdUser2IdAndIsDeletedFalse(user1Id, user2Id)
                    .orElseThrow(() -> new AppException(ErrorCode.FRIENDSHIP_NOT_FOUND));
            return friendshipMapper.toResponse(friendship);
        } catch (Exception e) {
            log.error("Error while fetching friendship by IDs {} and {}: {}", user1Id, user2Id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "friendships", key = "#result.user1Id + ':' + #result.user2Id")
    public FriendshipResponse createFriendship(FriendshipRequest request) {
        try {
            if (request == null || request.getRequesterId() == null || request.getReceiverId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Friendship friendship = friendshipMapper.toEntity(request);
            friendship = friendshipRepository.save(friendship);
            return friendshipMapper.toResponse(friendship);
        } catch (Exception e) {
            log.error("Error while creating friendship: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "friendships", key = "#user1Id + ':' + #user2Id")
    public FriendshipResponse updateFriendship(UUID user1Id, UUID user2Id, FriendshipRequest request) {
        try {
            if (user1Id == null || user2Id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Friendship friendship = friendshipRepository.findByIdUser1IdAndIdUser2IdAndIsDeletedFalse(user1Id, user2Id)
                    .orElseThrow(() -> new AppException(ErrorCode.FRIENDSHIP_NOT_FOUND));
            friendshipMapper.updateEntityFromRequest(request, friendship);
            friendship = friendshipRepository.save(friendship);
            return friendshipMapper.toResponse(friendship);
        } catch (Exception e) {
            log.error("Error while updating friendship between {} and {}: {}", user1Id, user2Id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "friendships", key = "#user1Id + ':' + #user2Id")
    public void deleteFriendship(UUID user1Id, UUID user2Id) {
        try {
            if (user1Id == null || user2Id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Friendship friendship = friendshipRepository.findByIdUser1IdAndIdUser2IdAndIsDeletedFalse(user1Id, user2Id)
                    .orElseThrow(() -> new AppException(ErrorCode.FRIENDSHIP_NOT_FOUND));
            friendshipRepository.softDeleteByUserIds(user1Id, user2Id);
        } catch (Exception e) {
            log.error("Error while deleting friendship between {} and {}: {}", user1Id, user2Id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}