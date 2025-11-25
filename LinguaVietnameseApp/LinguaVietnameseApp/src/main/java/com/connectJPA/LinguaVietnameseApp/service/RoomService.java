package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.JoinRoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomMemberRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemberResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface RoomService {
    RoomResponse joinRoom(JoinRoomRequest request);

    RoomResponse findOrCreatePrivateRoom(UUID userId1, UUID userId2);

// Thêm method signature
Page<RoomResponse> getJoinedRooms(UUID userId, RoomPurpose purpose, Pageable pageable);

    RoomResponse findOrCreateAiChatRoom(UUID userId);

    RoomResponse getRoomById(UUID id);
    RoomResponse createRoom(RoomRequest request);

    RoomResponse updateRoom(UUID id, RoomRequest request);
    void deleteRoom(UUID id);
    List<MemberResponse> getRoomMembers(UUID roomId);
    Page<RoomResponse> getAllRooms(String roomName, UUID creatorId, RoomPurpose purpose, RoomType roomType, Pageable pageable);

    void addRoomMembers(UUID roomId, List<RoomMemberRequest> memberRequests);
    void removeRoomMembers(UUID roomId, List<UUID> userIds);

    RoomResponse findOrCreateQuizRoom(UUID userId);
}