package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.JoinRoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomMemberRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemberResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.entity.RoomMember;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomRole;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.RoomMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomMemberRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final UserRepository userRepository;
    private final RoomMapper roomMapper;


@Override
    @Transactional(readOnly = true)
    public Page<RoomResponse> getJoinedRooms(UUID userId, RoomPurpose purpose, Pageable pageable) {
        try {
            Page<Room> rooms = roomRepository.findRoomsByMemberUserId(userId, purpose, pageable);
            return rooms.map(room -> {
                RoomResponse response = roomMapper.toResponse(room);
                long count = roomRepository.countMembersByRoomId(room.getRoomId());
                response.setMemberCount((int) count);
                return response;
            });
        } catch (Exception e) {
            log.error("Error fetching joined rooms for user {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public Page<RoomResponse> getAllRooms(String roomName, UUID creatorId, RoomPurpose purpose, RoomType roomType, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Room> rooms = roomRepository.findByRoomNameContainingAndCreatorIdAndPurposeAndRoomTypeAndIsDeletedFalse(
                    roomName, creatorId, purpose, roomType, pageable);

            return rooms.map(room -> {
                RoomResponse response = roomMapper.toResponse(room);

                long count = roomRepository.countMembersByRoomId(room.getRoomId());
                response.setMemberCount((int) count);

                userRepository.findByUserIdAndIsDeletedFalse(room.getCreatorId())
                        .ifPresent(user -> response.setCreatorName(
                                StringUtils.hasText(user.getNickname()) ? user.getNickname() : user.getFullname()
                        ));

                return response;
            });
        } catch (Exception e) {
            log.error("Error while fetching all rooms: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Transactional
    @Override
    public RoomResponse findOrCreatePrivateRoom(UUID userId1, UUID userId2) {
        Optional<Room> existingRoom = roomRepository.findPrivateRoomBetweenUsers(userId1, userId2);

        if (existingRoom.isPresent()) {
            return roomMapper.toResponse(existingRoom.get());
        }

        User user1 = userRepository.findByUserIdAndIsDeletedFalse(userId1)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        User user2 = userRepository.findByUserIdAndIsDeletedFalse(userId2)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Room room = Room.builder()
                .roomName(user1.getNickname() + " & " + user2.getNickname())
                .creatorId(userId1)
                .maxMembers(2)
                .purpose(RoomPurpose.PRIVATE_CHAT)
                .roomType(RoomType.PRIVATE)
                .roomCode(generateUniqueRoomCode())
                .isDeleted(false)
                .createdAt(OffsetDateTime.now())
                .build();

        room = roomRepository.save(room);

        RoomMember member1 = RoomMember.builder()
                .id(new RoomMemberId(room.getRoomId(), userId1))
                .room(room)
                .user(user1)
                .role(RoomRole.ADMIN)
                .joinedAt(OffsetDateTime.now())
                .build();
        roomMemberRepository.save(member1);

        RoomMember member2 = RoomMember.builder()
                .id(new RoomMemberId(room.getRoomId(), userId2))
                .room(room)
                .user(user2)
                .role(RoomRole.MEMBER)
                .joinedAt(OffsetDateTime.now())
                .build();
        roomMemberRepository.save(member2);

        return roomMapper.toResponse(room);
    }

    @Transactional
    @Override
    public RoomResponse findOrCreateAiChatRoom(UUID userId) {
        if (userId == null) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        RoomPurpose aiPurpose = RoomPurpose.AI_CHAT;
        RoomType aiRoomType = RoomType.PRIVATE;

        Room room = roomRepository.findByCreatorIdAndPurposeAndRoomTypeAndIsDeletedFalse(
                userId, aiPurpose, aiRoomType
        ).orElse(null);

        if (room != null) {
            log.info("Found existing AI room {} for user {}", room.getRoomId(), userId);
            return roomMapper.toResponse(room);
        }

        log.info("No AI room found for user {}. Creating new one.", userId);

        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        RoomRequest newRoomRequest = RoomRequest.builder()
                .roomName("AI Chat with " + user.getNickname())
                .creatorId(userId)
                .purpose(aiPurpose)
                .roomType(aiRoomType)
                .maxMembers(2)
                .build();

        return this.createRoom(newRoomRequest);
    }

    @Override
    public RoomResponse getRoomById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            RoomResponse response = roomMapper.toResponse(room);
            response.setMemberCount((int) roomRepository.countMembersByRoomId(id));
            return response;
        } catch (Exception e) {
            log.error("Error while fetching room by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        try {
            if (request == null || request.getCreatorId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            User creator = userRepository.findByUserIdAndIsDeletedFalse(request.getCreatorId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            Room room = roomMapper.toEntity(request);
            room.setRoomCode(generateUniqueRoomCode());
            room = roomRepository.save(room);

            RoomMember member = RoomMember.builder()
                    .id(new RoomMemberId(room.getRoomId(), request.getCreatorId()))
                    .room(room)
                    .user(creator)
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

    private String generateUniqueRoomCode() {
        Random random = new Random();
        String code;
        int attempts = 0;
        do {
            int number = random.nextInt(1000000);
            code = String.format("%06d", number);
            attempts++;
            if (attempts > 10) throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } while (roomRepository.existsByRoomCode(code));
        return code;
    }

    @Transactional
    @Override
    public RoomResponse joinRoom(JoinRoomRequest request) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());

        Optional<Room> roomOpt = Optional.empty();
        if (request.getRoomId() != null) {
            roomOpt = roomRepository.findByRoomIdAndIsDeletedFalse(request.getRoomId());
        }
        if (roomOpt.isEmpty() && StringUtils.hasText(request.getRoomCode())) {
            roomOpt = roomRepository.findByRoomCodeAndIsDeletedFalse(request.getRoomCode());
        }

        Room room = roomOpt.orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        long currentMembers = roomRepository.countMembersByRoomId(room.getRoomId());
        if (currentMembers >= room.getMaxMembers()) {
            throw new AppException(ErrorCode.EXCEEDS_MAX_MEMBERS);
        }

        if (room.getRoomType() == RoomType.PRIVATE) {
            if (!StringUtils.hasText(request.getPassword()) || !request.getPassword().equals(room.getPassword())) {
                throw new AppException(ErrorCode.INVALID_PASSWORD);
            }
        }

        if (roomMemberRepository.existsById(new RoomMemberId(room.getRoomId(), userId))) {
            return roomMapper.toResponse(room);
        }

        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        RoomMember member = RoomMember.builder()
                .id(new RoomMemberId(room.getRoomId(), userId))
                .room(room)
                .user(user)
                .role(RoomRole.MEMBER)
                .joinedAt(OffsetDateTime.now())
                .build();
        roomMemberRepository.save(member);

        return roomMapper.toResponse(room);
    }

    @Override
    @Transactional
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
    @Transactional(readOnly = true)
    public List<MemberResponse> getRoomMembers(UUID roomId) {
        try {
            if (!roomRepository.existsById(roomId)) {
                throw new AppException(ErrorCode.ROOM_NOT_FOUND);
            }

            List<RoomMember> members = roomMemberRepository.findAllById_RoomIdAndIsDeletedFalse(roomId);

            return members.stream()
                    .map(member -> {
                        User user = member.getUser();
                        if (user == null || user.isDeleted()) {
                            log.warn("RoomMember with id {} references a null or deleted user {}", member.getId(), member.getId().getUserId());
                            return null;
                        }

                        return MemberResponse.builder()
                                .userId(user.getUserId())
                                .nickname(user.getNickname())
                                .fullname(user.getFullname())
                                .avatarUrl(user.getAvatarUrl())
                                .role(String.valueOf(member.getRole()))
                                .isOnline(user.isOnline())
                                .build();
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

        } catch (AppException e) {
            log.warn("Error fetching room members for room {}: {}", roomId, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Error while fetching members for room ID {}: {}", roomId, e.getMessage());
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
                User user = userRepository.findByUserIdAndIsDeletedFalse(req.getUserId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                RoomMember member = RoomMember.builder()
                        .id(new RoomMemberId(roomId, req.getUserId()))
                        .room(room)
                        .user(user)
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

    @Transactional
    @Override
    public RoomResponse findOrCreateQuizRoom(UUID userId) {
        if (userId == null) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Page<Room> availableRooms = roomRepository.findAvailableRoomsByPurposeAndType(
                RoomPurpose.QUIZ_TEAM,
                RoomType.PUBLIC,
                PageRequest.of(0, 1)
        );

        Room roomToJoin;
        if (availableRooms.hasContent()) {
            roomToJoin = availableRooms.getContent().get(0);
            log.info("Found available quiz room: {}", roomToJoin.getRoomId());
        } else {
            log.info("No available quiz rooms found. Creating a new one for user {}", userId);
            RoomRequest newRoomRequest = RoomRequest.builder()
                    .roomName("Team Quiz Room")
                    .creatorId(userId)
                    .purpose(RoomPurpose.QUIZ_TEAM)
                    .roomType(RoomType.PUBLIC)
                    .maxMembers(10)
                    .build();

            return this.createRoom(newRoomRequest);
        }

        RoomMemberId memberId = new RoomMemberId(roomToJoin.getRoomId(), userId);
        if (!roomMemberRepository.existsById(memberId)) {
            long currentMembers = roomMemberRepository.countByIdRoomIdAndIsDeletedFalse(roomToJoin.getRoomId());
            if (currentMembers >= roomToJoin.getMaxMembers()) {
                log.warn("Room {} is full. Recursively finding another room.", roomToJoin.getRoomId());
                return findOrCreateQuizRoom(userId);
            }

            log.info("Adding user {} to room {}", userId, roomToJoin.getRoomId());
            RoomMember member = RoomMember.builder()
                    .id(memberId)
                    .room(roomToJoin)
                    .user(user)
                    .role(RoomRole.MEMBER)
                    .joinedAt(OffsetDateTime.now())
                    .build();
            roomMemberRepository.save(member);
        } else {
            log.info("User {} is already in room {}", userId, roomToJoin.getRoomId());
        }

        RoomResponse response = roomMapper.toResponse(roomToJoin);
        response.setMemberCount((int) roomRepository.countMembersByRoomId(roomToJoin.getRoomId()));
        return response;
    }
}