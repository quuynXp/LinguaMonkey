package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.FriendshipRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendRequestResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendRequestStatusResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendshipResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface FriendshipService {
    Page<FriendshipResponse> getAllFriendships(String user1Id, String status, Pageable pageable);
    FriendshipResponse getFriendshipByIds(UUID user1Id, UUID user2Id);
    FriendshipResponse createFriendship(FriendshipRequest request);
    FriendshipResponse updateFriendship(UUID user1Id, UUID user2Id, FriendshipRequest request);
    void deleteFriendship(UUID user1Id, UUID user2Id);
    boolean isFriends(UUID user1Id, UUID user2Id);
    FriendRequestStatusResponse getFriendRequestStatus(UUID currentUserId, UUID otherUserId);
    Page<FriendshipResponse> getPendingRequestsForUser(UUID userId, Pageable pageable);
}