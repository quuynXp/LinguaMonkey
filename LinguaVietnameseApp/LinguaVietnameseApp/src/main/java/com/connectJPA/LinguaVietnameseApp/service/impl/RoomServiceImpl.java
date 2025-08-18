package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.RoomMemberRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.entity.RoomMember;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomRole;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.RoomMapper;
import com.connectJPA.LinguaVietnameseApp.repository.RoomMemberRepository;
import com.connectJPA.LinguaVietnameseApp.repository.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.repository.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomServiceImpl implements RoomService {
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final UserRepository userRepository;
    private final RoomMapper roomMapper;

    @Override
    @Cacheable(value = "rooms", key = "#roomName + ':' + #creatorId + ':' + #purpose + ':' + #roomType + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<RoomResponse> getAllRooms(String roomName, UUID creatorId, RoomPurpose purpose, RoomType roomType, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Room> rooms = roomRepository.findByRoomNameContainingAndCreatorIdAndPurposeAndRoomTypeAndIsDeletedFalse(
                    roomName, creatorId, purpose, roomType, pageable);
            return rooms.map(roomMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all rooms: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "rooms", key = "#id")
    public RoomResponse getRoomById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            return roomMapper.toResponse(room);
        } catch (Exception e) {
            log.error("Error while fetching room by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "rooms", key = "#result.roomId")
    public RoomResponse createRoom(RoomRequest request) {
        try {
            if (request == null || request.getCreatorId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            userRepository.findByUserIdAndIsDeletedFalse(request.getCreatorId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            Room room = roomMapper.toEntity(request);
            room = roomRepository.save(room);

            // Add creator as a member
            RoomMember member = RoomMember.builder()
                    .id(new RoomMemberId(room.getRoomId(), request.getCreatorId()))
                    .role(RoomRole.ADMIN)
                    .joinedAt(OffsetDateTime.now())
                    .build();
            roomMemberRepository.save(member);

            return roomMapper.toResponse(room);
        } catch (Exception e) {
            log.error("Error while creating room: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "rooms", key = "#id")
    public RoomResponse updateRoom(UUID id, RoomRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!room.getCreatorId().toString().equals(currentUserId)) {
                throw new AppException(ErrorCode.NOT_ROOM_CREATOR);
            }
            userRepository.findByUserIdAndIsDeletedFalse(request.getCreatorId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            roomMapper.updateEntityFromRequest(request, room);
            room = roomRepository.save(room);
            return roomMapper.toResponse(room);
        } catch (Exception e) {
            log.error("Error while updating room ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "rooms", key = "#id")
    public void deleteRoom(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!room.getCreatorId().toString().equals(currentUserId)) {
                throw new AppException(ErrorCode.NOT_ROOM_CREATOR);
            }
            roomRepository.softDeleteByRoomId(id);
        } catch (Exception e) {
            log.error("Error while deleting room ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void addRoomMembers(UUID roomId, List<RoomMemberRequest> memberRequests) {
        try {
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            if (room.getPurpose() != RoomPurpose.GROUP_CHAT) {
                throw new AppException(ErrorCode.NOT_GROUP_CHAT);
            }
            String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!room.getCreatorId().toString().equals(currentUserId)) {
                throw new AppException(ErrorCode.NOT_ROOM_CREATOR);
            }
            long currentMembers = roomMemberRepository.countByIdRoomIdAndIsDeletedFalse(roomId);
            if (currentMembers + memberRequests.size() > room.getMaxMembers()) {
                throw new AppException(ErrorCode.EXCEEDS_MAX_MEMBERS);
            }
            for (RoomMemberRequest req : memberRequests) {
                userRepository.findByUserIdAndIsDeletedFalse(req.getUserId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                RoomMember member = RoomMember.builder()
                        .id(new RoomMemberId(roomId, req.getUserId()))
                        .role(req.getRole() != null ? RoomRole.valueOf(req.getRole()) : RoomRole.MEMBER)
                        .joinedAt(OffsetDateTime.now())
                        .build();
                roomMemberRepository.save(member);
            }
        } catch (Exception e) {
            log.error("Error while adding members to room ID {}: {}", roomId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void removeRoomMembers(UUID roomId, List<UUID> userIds) {
        try {
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            if (room.getPurpose() != RoomPurpose.GROUP_CHAT) {
                throw new AppException(ErrorCode.NOT_GROUP_CHAT);
            }
            String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!room.getCreatorId().toString().equals(currentUserId)) {
                throw new AppException(ErrorCode.NOT_ROOM_CREATOR);
            }
            for (UUID userId : userIds) {
                roomMemberRepository.findByIdRoomIdAndIdUserIdAndIsDeletedFalse(roomId, userId)
                        .orElseThrow(() -> new AppException(ErrorCode.NOT_ROOM_MEMBER));
                roomMemberRepository.softDeleteByIdRoomIdAndIdUserId(roomId, userId);
            }
        } catch (Exception e) {
            log.error("Error while removing members from room ID {}: {}", roomId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}