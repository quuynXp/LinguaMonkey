package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.RoomMemberRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface RoomService {
    RoomResponse getRoomById(UUID id);
    RoomResponse createRoom(RoomRequest request);
    RoomResponse updateRoom(UUID id, RoomRequest request);
    void deleteRoom(UUID id);

    Page<RoomResponse> getAllRooms(String roomName, UUID creatorId, RoomPurpose purpose, RoomType roomType, Pageable pageable);

    void addRoomMembers(UUID roomId, List<RoomMemberRequest> memberRequests);
    void removeRoomMembers(UUID roomId, List<UUID> userIds);
}