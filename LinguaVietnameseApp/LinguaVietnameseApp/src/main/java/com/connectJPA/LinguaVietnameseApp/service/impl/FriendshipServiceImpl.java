package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.FriendshipRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendRequestStatusResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendshipResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Friendship;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.id.FriendshipId;
import com.connectJPA.LinguaVietnameseApp.enums.FriendshipStatus;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.FriendshipMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.UserMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.FriendshipRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    private FriendshipResponse toPopulatedResponse(Friendship friendship) {
        FriendshipResponse response = friendshipMapper.toResponse(friendship);
        // Ensure ID string is generated safely
        if (friendship.getId() != null) {
            response.setId(friendship.getId().getRequesterId().toString() + "-" + friendship.getId().getReceiverId().toString());
        }

        // Fetch users if they are proxies or not fully loaded
        // Logic fix: Ensure we fetch freshly to populate response DTOs fully
        User requester = userRepository.findById(friendship.getId().getRequesterId())
                .orElse(new User());
        User receiver = userRepository.findById(friendship.getId().getReceiverId())
                .orElse(new User());

        response.setRequester(userMapper.toResponse(requester));
        response.setReceiver(userMapper.toResponse(receiver));
        return response;
    }

    @Override
    public Page<FriendshipResponse> getAllFriendships(String requesterIdStr, String receiverIdStr, String status, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }

            UUID requesterUuid = (requesterIdStr != null && !requesterIdStr.isEmpty()) ? UUID.fromString(requesterIdStr) : null;
            UUID receiverUuid = (receiverIdStr != null && !receiverIdStr.isEmpty()) ? UUID.fromString(receiverIdStr) : null;
            
            FriendshipStatus statusEnum = null;
            if (status != null && !status.isEmpty()) {
                try {
                    statusEnum = FriendshipStatus.valueOf(status.toUpperCase());
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid friendship status provided: {}", status);
                }
            }

            Page<Friendship> friendships;

            // CASE 1: Get ACCEPTED friends (Bidirectional)
            // If status is ACCEPTED, we check BOTH columns regardless of who is requester/receiver
            if (statusEnum == FriendshipStatus.ACCEPTED) {
                UUID targetUser = requesterUuid != null ? requesterUuid : receiverUuid;
                if (targetUser != null) {
                    friendships = friendshipRepository.findAllFriendshipsByUserIdAndStatus(targetUser, statusEnum, pageable);
                } else {
                    // Fallback (rarely used): list all accepted in system or handle error
                    friendships = Page.empty(pageable);
                }
            } 
            // CASE 2: Get PENDING or other status (Unidirectional strict check)
            else {
                if (requesterUuid != null) {
                    // "Sent Requests": Current user is Requester
                    friendships = friendshipRepository.findByIdRequesterIdAndStatusAndIsDeletedFalse(requesterUuid, statusEnum, pageable);
                } else if (receiverUuid != null) {
                    // "Received Requests": Current user is Receiver
                    // We use the specific repository method for pending received requests
                    if (statusEnum == FriendshipStatus.PENDING) {
                        friendships = friendshipRepository.findPendingRequests(receiverUuid, pageable);
                    } else {
                        // Generic fallback for receiver column query if needed, currently reusing pending
                        friendships = friendshipRepository.findPendingRequests(receiverUuid, pageable);
                    }
                } else {
                     friendships = Page.empty(pageable);
                }
            }

            return friendships.map(this::toPopulatedResponse);
        } catch (IllegalArgumentException e) {
             throw new AppException(ErrorCode.INVALID_KEY);
        } catch (Exception e) {
            log.error("Error while fetching friendships: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public FriendRequestStatusResponse getFriendRequestStatus(UUID currentUserId, UUID otherUserId) {
        try {
            if (currentUserId == null || otherUserId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            
            boolean hasSent = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(currentUserId, otherUserId)
                    .filter(f -> f.getStatus() == FriendshipStatus.PENDING)
                    .isPresent();
            
            boolean hasReceived = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(otherUserId, currentUserId)
                    .filter(f -> f.getStatus() == FriendshipStatus.PENDING)
                    .isPresent();
            
            FriendRequestStatusResponse response = new FriendRequestStatusResponse();
            response.setHasSentRequest(hasSent);
            response.setHasReceivedRequest(hasReceived);
            return response;
        } catch (Exception e) {
            log.error("Error checking friend request status between {} and {}: {}", currentUserId, otherUserId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public Page<FriendshipResponse> getPendingRequestsForUser(UUID userId, Pageable pageable) {
        Page<Friendship> requests = friendshipRepository.findPendingRequests(userId, pageable);
        return requests.map(this::toPopulatedResponse);
    }

    @Override
    public boolean isFriends(UUID user1Id, UUID user2Id) {
        try {
            if (user1Id == null || user2Id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            
            boolean direct = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(user1Id, user2Id)
                    .filter(f -> f.getStatus() == FriendshipStatus.ACCEPTED)
                    .isPresent();
            
            boolean reverse = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(user2Id, user1Id)
                    .filter(f -> f.getStatus() == FriendshipStatus.ACCEPTED)
                    .isPresent();
            
            return direct || reverse;
        } catch (Exception e) {
            log.error("Error checking friendship between {} and {}: {}", user1Id, user2Id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }


    @Override
    public FriendshipResponse getFriendshipByIds(UUID user1Id, UUID user2Id) {
        try {
            if (user1Id == null || user2Id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Friendship friendship = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(user1Id, user2Id)
                    .orElseThrow(() -> new AppException(ErrorCode.FRIENDSHIP_NOT_FOUND));
            return toPopulatedResponse(friendship);
        } catch (Exception e) {
            log.error("Error while fetching friendship by IDs {} and {}: {}", user1Id, user2Id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public FriendshipResponse createFriendship(FriendshipRequest request) {
        try {
            if (request == null || request.getRequesterId() == null || request.getReceiverId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }

            // CHECK: Prevent duplicate requests
            boolean exists = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(request.getRequesterId(), request.getReceiverId())
                    .isPresent();
            if (exists) {
                Friendship existing = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(request.getRequesterId(), request.getReceiverId()).get();
                return toPopulatedResponse(existing);
            }

            User requester = userRepository.findById(request.getRequesterId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            User receiver = userRepository.findById(request.getReceiverId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            
            Friendship friendship = friendshipMapper.toEntity(request);
            
            FriendshipId id = new FriendshipId(request.getRequesterId(), request.getReceiverId());
            friendship.setId(id);
            
            // Explicitly set the relationship fields
            friendship.setRequester(requester);
            friendship.setReceiver(receiver);
            
            if (friendship.getStatus() == null) {
                friendship.setStatus(FriendshipStatus.PENDING);
            }

            friendship = friendshipRepository.save(friendship);
            return toPopulatedResponse(friendship);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error while creating friendship: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public FriendshipResponse updateFriendship(UUID requesterId, UUID receiverId, FriendshipRequest request) {
        try {
            if (requesterId == null || receiverId == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Friendship friendship = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(requesterId, receiverId)
                    .orElseThrow(() -> new AppException(ErrorCode.FRIENDSHIP_NOT_FOUND));
            
            friendshipMapper.updateEntityFromRequest(request, friendship);
            
            // Ensure relationships persist if mapper touched them
            if (friendship.getRequester() == null) {
                friendship.setRequester(userRepository.findById(requesterId).orElse(null));
            }
            if (friendship.getReceiver() == null) {
                friendship.setReceiver(userRepository.findById(receiverId).orElse(null));
            }

            friendship = friendshipRepository.save(friendship);
            return toPopulatedResponse(friendship);
        } catch (Exception e) {
            log.error("Error while updating friendship between {} and {}: {}", requesterId, receiverId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteFriendship(UUID requesterId, UUID receiverId) {
        try {
            if (requesterId == null || receiverId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Friendship friendship = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(requesterId, receiverId)
                    .orElseThrow(() -> new AppException(ErrorCode.FRIENDSHIP_NOT_FOUND));
            
            friendshipRepository.softDeleteByUserIds(requesterId, receiverId);
        } catch (Exception e) {
            log.error("Error while deleting friendship between {} and {}: {}", requesterId, receiverId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}