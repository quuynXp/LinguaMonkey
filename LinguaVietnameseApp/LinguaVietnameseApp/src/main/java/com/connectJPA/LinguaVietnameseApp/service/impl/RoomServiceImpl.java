package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.JoinRoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomMemberRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemberResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserProfileResponse;
import com.connectJPA.LinguaVietnameseApp.entity.ChatMessage;
import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.entity.RoomMember;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import com.connectJPA.LinguaVietnameseApp.enums.NotificationType;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomRole;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.RoomMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.UserMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.ChatMessageRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomMemberRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
import com.connectJPA.LinguaVietnameseApp.utils.UserStatusUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
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
    private final UserMapper userMapper;
    private final ChatMessageRepository chatMessageRepository;
    private final NotificationService notificationService;

    // Helper to safely get UUID from Security Context
    private UUID getCurrentUserUUID() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException e) {
            log.warn("Current Principal name is not a valid UUID: {}", auth.getName());
            return null;
        }
    }

    private RoomResponse toRoomResponseWithMembers(Room room) {
        RoomResponse response = roomMapper.toResponse(room);
        long memberCount = roomRepository.countMembersByRoomId(room.getRoomId());
        response.setMemberCount((int) memberCount);

        List<RoomMember> members = roomMemberRepository.findAllById_RoomIdAndIsDeletedFalse(room.getRoomId());

        // 1. Map danh sách thành viên
        List<UserProfileResponse> memberProfiles = members.stream()
            .map(RoomMember::getUser)
            .map(user -> UserProfileResponse.builder()
                    .userId(user.getUserId())
                    .fullname(user.getFullname())
                    .nickname(user.getNickname())
                    .avatarUrl(user.getAvatarUrl())
                    .build())
            .collect(Collectors.toList());

        response.setMembers(memberProfiles);

        // 2. LOGIC MỚI: Tính toán Partner Online/Offline cho Private Room
        if (room.getRoomType() == RoomType.PRIVATE) {
            try {
                UUID currentUserId = getCurrentUserUUID();
                if (currentUserId != null) {
                    // Tìm partner (người không phải là mình)
                    Optional<RoomMember> partnerOpt = members.stream()
                            .filter(m -> !m.getId().getUserId().equals(currentUserId))
                            .findFirst();

                    if (partnerOpt.isPresent()) {
                        User partner = partnerOpt.get().getUser();
                        // Set các thông tin quan trọng cho Client hiển thị
                        response.setPartnerIsOnline(UserStatusUtils.isOnline(partner.getLastActiveAt()));
                        response.setPartnerLastActiveText(UserStatusUtils.formatLastActive(partner.getLastActiveAt()));
                    }
                }
            } catch (Exception e) {
                log.warn("Cannot determine partner status in toRoomResponseWithMembers: {}", e.getMessage());
            }
        }

        return response;
    }


    @Override
    @Transactional(readOnly = true)
    public Page<RoomResponse> getJoinedRooms(UUID userId, RoomPurpose purpose, Pageable pageable) {
        Page<Room> rooms = roomRepository.findJoinedRoomsStrict(userId, purpose, pageable);

        return rooms.map(room -> {
            RoomResponse response = roomMapper.toResponse(room);
            long memberCount = roomRepository.countMembersByRoomId(room.getRoomId());
            response.setMemberCount((int) memberCount);

            if (room.getRoomType() == RoomType.PRIVATE) {
                List<RoomMember> members = roomMemberRepository.findAllById_RoomIdAndIsDeletedFalse(room.getRoomId());
                Optional<RoomMember> partnerOpt = members.stream()
                        .filter(m -> !m.getId().getUserId().equals(userId))
                        .findFirst();

                if (partnerOpt.isPresent()) {
                    User partner = partnerOpt.get().getUser();
                    response.setRoomName(partner.getNickname() != null ? partner.getNickname() : partner.getFullname());
                    response.setAvatarUrl(partner.getAvatarUrl());
                    response.setPartnerIsOnline(UserStatusUtils.isOnline(partner.getLastActiveAt()));
                    response.setPartnerLastActiveText(UserStatusUtils.formatLastActive(partner.getLastActiveAt()));
                } else {
                    response.setRoomName("Unknown User");
                }
            } else if (room.getPurpose() == RoomPurpose.COURSE_CHAT) {
                response.setRoomName(room.getRoomName());
                userRepository.findByUserIdAndIsDeletedFalse(room.getCreatorId())
                        .ifPresent(creator -> response.setCreatorAvatarUrl(creator.getAvatarUrl()));
            } else {
                if (response.getRoomName() == null) response.setRoomName("Group Chat");
                userRepository.findByUserIdAndIsDeletedFalse(room.getCreatorId())
                        .ifPresent(creator -> response.setCreatorAvatarUrl(creator.getAvatarUrl()));
            }

            chatMessageRepository.findFirstByRoomIdAndIsDeletedFalseOrderByIdSentAtDesc(room.getRoomId())
                    .ifPresent(msg -> {
                        response.setLastMessage(msg.getContent());
                        response.setLastMessageTime(msg.getId().getSentAt());
                        response.setLastMessageTime(msg.getId().getSentAt());
                        response.setLastMessageSenderId(msg.getSenderId().toString());
                        response.setLastMessageSenderEphemeralKey(msg.getSenderEphemeralKey());
                        response.setLastMessageInitializationVector(msg.getInitializationVector());
                        response.setLastMessageSelfContent(msg.getSelfContent());
                        response.setLastMessageSelfEphemeralKey(msg.getSelfEphemeralKey());
                        response.setLastMessageSelfInitializationVector(msg.getSelfInitializationVector());
                    });
                    

            return response;
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RoomResponse> getAllRooms(String roomName, UUID creatorId, RoomPurpose purpose, RoomType roomType, Pageable pageable) {
        UUID currentUserId = getCurrentUserUUID();
        
        Page<Room> rooms = roomRepository.findAllPublicRoomsWithPriority(
                roomName, 
                creatorId, 
                purpose, 
                roomType, 
                currentUserId, // Truyền userId vào để check joined
                pageable
        );

        return rooms.map(room -> {
            RoomResponse response = roomMapper.toResponse(room);
            long count = roomRepository.countMembersByRoomId(room.getRoomId());
            response.setMemberCount((int) count);

            userRepository.findByUserIdAndIsDeletedFalse(room.getCreatorId())
                    .ifPresent(user -> {
                        response.setCreatorName(StringUtils.hasText(user.getNickname()) ? user.getNickname() : user.getFullname());
                        response.setCreatorAvatarUrl(user.getAvatarUrl());
                    });
            
            return response;
        });
    }

    @Override
    @Transactional
    public void ensureCourseRoomExists(UUID courseId, String courseTitle, UUID creatorId) {
        Room room = roomRepository.findByCourseIdAndIsDeletedFalse(courseId).orElse(null);
        User creator = userRepository.findByUserIdAndIsDeletedFalse(creatorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (room == null) {
            room = Room.builder()
                    .roomName("Course: " + courseTitle)
                    .creatorId(creatorId)
                    .courseId(courseId)
                    .maxMembers(500)
                    .purpose(RoomPurpose.COURSE_CHAT)
                    .roomType(RoomType.PUBLIC)
                    .roomCode(generateUniqueRoomCode())
                    .isDeleted(false)
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();
            room = roomRepository.save(room);
            log.info("Created Course Room for Course ID: {}", courseId);
        }

        // 2. ALWAYS Check if Creator is in the room. If not, Add them.
        boolean isCreatorInRoom = roomMemberRepository.existsById_RoomIdAndId_UserIdAndIsDeletedFalse(room.getRoomId(), creatorId);
        
        if (!isCreatorInRoom) {
            RoomMember member = RoomMember.builder()
                    .id(new RoomMemberId(room.getRoomId(), creatorId))
                    .room(room)
                    .user(creator)
                    .role(RoomRole.ADMIN)
                    .isAdmin(true)
                    .joinedAt(OffsetDateTime.now())
                    .build();
            roomMemberRepository.save(member);
            log.info("Ensured Creator {} is added to Course Room {}", creatorId, room.getRoomId());
        }
    }

    @Override
    @Transactional
    public void addUserToCourseRoom(UUID courseId, UUID userId) {
        Room room = roomRepository.findByCourseIdAndIsDeletedFalse(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        if (!roomMemberRepository.existsById_RoomIdAndId_UserIdAndIsDeletedFalse(room.getRoomId(), userId)) {
            User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            RoomMember member = RoomMember.builder()
                    .id(new RoomMemberId(room.getRoomId(), userId))
                    .room(room)
                    .user(user)
                    .role(RoomRole.MEMBER)
                    .isAdmin(false)
                    .joinedAt(OffsetDateTime.now())
                    .build();
            roomMemberRepository.save(member);
            log.info("Added User {} to Course Room {}", userId, room.getRoomId());
        }
    }

    @Override
    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        User creator = userRepository.findByUserIdAndIsDeletedFalse(request.getCreatorId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Room room = roomMapper.toEntity(request);
        room.setRoomCode(generateUniqueRoomCode());
        room.setUpdatedAt(OffsetDateTime.now());
        room = roomRepository.save(room);

        // 1. Thêm Creator (Admin)
        RoomMember creatorMember = RoomMember.builder()
                .id(new RoomMemberId(room.getRoomId(), request.getCreatorId()))
                .room(room)
                .user(creator)
                .role(RoomRole.ADMIN)
                .isAdmin(true)
                .joinedAt(OffsetDateTime.now())
                .build();
        roomMemberRepository.save(creatorMember);

        // Danh sách các thành viên (bao gồm cả creator)
        List<User> initialMembers = new ArrayList<>();
        initialMembers.add(creator);

        // 2. Thêm các thành viên được mời (memberIds)
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            List<UUID> memberIdsToAdd = request.getMemberIds().stream()
                .filter(id -> !id.equals(request.getCreatorId())) // Loại bỏ creator nếu có
                .distinct()
                .collect(Collectors.toList());

            if (!memberIdsToAdd.isEmpty()) {
                // Lấy User Entity của tất cả thành viên được mời
                List<User> invitedUsers = userRepository.findAllById(memberIdsToAdd);

                for (User user : invitedUsers) {
                    if (initialMembers.size() >= room.getMaxMembers()) {
                        log.warn("Room {} reached max members, stopping addition.", room.getRoomId());
                        break;
                    }

                    RoomMember member = RoomMember.builder()
                            .id(new RoomMemberId(room.getRoomId(), user.getUserId()))
                            .room(room)
                            .user(user)
                            .role(RoomRole.MEMBER)
                            .isAdmin(false)
                            .joinedAt(OffsetDateTime.now())
                            .build();
                    roomMemberRepository.save(member);
                    initialMembers.add(user);
                    sendInviteNotification(user.getUserId(), room);
                }
            }
        }

        // Trả về response thông qua hàm chuẩn hóa đã fix
        return toRoomResponseWithMembers(room);
    }

    @Override
    @Transactional
    public RoomResponse findOrCreatePrivateRoom(UUID userId1, UUID userId2) {
        if (userId1.equals(userId2)) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        Optional<Room> existingRoom = roomRepository.findPrivateRoomBetweenUsers(userId1, userId2);
        if (existingRoom.isPresent()) {
            Room room = existingRoom.get();
            restoreMemberIfDeleted(room, userId1);
            restoreMemberIfDeleted(room, userId2);
            // Cập nhật để trả về response đầy đủ thành viên
            return toRoomResponseWithMembers(room);
        }

        User user1 = userRepository.findByUserIdAndIsDeletedFalse(userId1).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        User user2 = userRepository.findByUserIdAndIsDeletedFalse(userId2).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Room room = Room.builder()
                .roomName("Private")
                .creatorId(userId1)
                .maxMembers(2)
                .purpose(RoomPurpose.PRIVATE_CHAT)
                .roomType(RoomType.PRIVATE)
                .roomCode(generateUniqueRoomCode())
                .isDeleted(false)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        room = roomRepository.save(room);

        roomMemberRepository.save(RoomMember.builder()
                .id(new RoomMemberId(room.getRoomId(), userId1))
                .room(room)
                .user(user1)
                .role(RoomRole.ADMIN)
                .isAdmin(true)
                .joinedAt(OffsetDateTime.now())
                .build());

        roomMemberRepository.save(RoomMember.builder()
                .id(new RoomMemberId(room.getRoomId(), userId2))
                .room(room)
                .user(user2)
                .role(RoomRole.MEMBER)
                .isAdmin(false)
                .joinedAt(OffsetDateTime.now())
                .build());

        // Cập nhật để trả về response đầy đủ thành viên
        return toRoomResponseWithMembers(room);
    }

    private void restoreMemberIfDeleted(Room room, UUID userId) {
        Optional<RoomMember> memberOpt = roomMemberRepository.findById(new RoomMemberId(room.getRoomId(), userId));
        if (memberOpt.isPresent()) {
            RoomMember member = memberOpt.get();
            if (Boolean.TRUE.equals(member.isDeleted())) {
                member.setDeleted(false);
                member.setDeletedAt(null);
                member.setJoinedAt(OffsetDateTime.now());
                roomMemberRepository.save(member);
            }
        } else {
             User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
             RoomMember newMember = RoomMember.builder()
                 .id(new RoomMemberId(room.getRoomId(), userId))
                 .room(room)
                 .user(user)
                 .role(RoomRole.MEMBER)
                 .isAdmin(false)
                 .joinedAt(OffsetDateTime.now())
                 .build();
             roomMemberRepository.save(newMember);
        }
    }

    @Override
    @Transactional
    public void leaveRoom(UUID roomId, UUID targetAdminId) {
        UUID currentUserId = getCurrentUserUUID();
        if (currentUserId == null) throw new AppException(ErrorCode.UNAUTHORIZED);

        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        RoomMember currentMember = roomMemberRepository.findByIdRoomIdAndIdUserIdAndIsDeletedFalse(roomId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_ROOM_MEMBER));

        roomMemberRepository.softDeleteByIdRoomIdAndIdUserId(roomId, currentUserId);

        List<RoomMember> remainingMembers = roomMemberRepository.findAllByIdRoomIdAndIsDeletedFalse(roomId);

        if (remainingMembers.isEmpty()) {
            roomRepository.softDeleteByRoomId(roomId);
            return;
        }

        if (Boolean.TRUE.equals(currentMember.getIsAdmin())) {
            RoomMember newAdmin = null;

            if (targetAdminId != null) {
                newAdmin = remainingMembers.stream()
                        .filter(m -> m.getId().getUserId().equals(targetAdminId))
                        .findFirst()
                        .orElse(null);
            }

            if (newAdmin == null) {
                Collections.shuffle(remainingMembers);
                newAdmin = remainingMembers.get(0);
            }

            newAdmin.setIsAdmin(true);
            newAdmin.setRole(RoomRole.ADMIN);
            roomMemberRepository.save(newAdmin);

            room.setCreatorId(newAdmin.getId().getUserId());
            roomRepository.save(room);
        }
    }

    @Override
    @Transactional
    public void addRoomMembers(UUID roomId, List<RoomMemberRequest> memberRequests) {
        Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        UUID currentUserId = getCurrentUserUUID();
        if (currentUserId == null) throw new AppException(ErrorCode.UNAUTHORIZED);

        if (!room.getCreatorId().equals(currentUserId)) {
             RoomMember requester = roomMemberRepository.findByIdRoomIdAndIdUserIdAndIsDeletedFalse(roomId, currentUserId)
                          .orElseThrow(() -> new AppException(ErrorCode.NOT_ROOM_MEMBER));
             if(!Boolean.TRUE.equals(requester.getIsAdmin())) {
                 throw new AppException(ErrorCode.UNAUTHORIZED);
             }
        }

        long currentCount = roomMemberRepository.countByIdRoomIdAndIsDeletedFalse(roomId);
        if (currentCount + memberRequests.size() > room.getMaxMembers()) {
            throw new AppException(ErrorCode.EXCEEDS_MAX_MEMBERS);
        }

        for (RoomMemberRequest req : memberRequests) {
            User user = userRepository.findByUserIdAndIsDeletedFalse(req.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            if (roomMemberRepository.existsById_RoomIdAndId_UserIdAndIsDeletedFalse(roomId, user.getUserId())) {
                continue;
            }

            RoomMember member = RoomMember.builder()
                    .id(new RoomMemberId(roomId, user.getUserId()))
                    .room(room)
                    .user(user)
                    .role(RoomRole.MEMBER)
                    .isAdmin(false)
                    .joinedAt(OffsetDateTime.now())
                    .build();
            roomMemberRepository.save(member);

            sendInviteNotification(user.getUserId(), room);
        }
    }

    private void sendInviteNotification(UUID userId, Room room) {
        NotificationRequest request = NotificationRequest.builder()
                .userId(userId)
                .title("Room Invitation")
                .content("You have been added to room: " + room.getRoomName())
                .type(NotificationType.SYSTEM.name())
                .payload(String.format("{\"screen\":\"Chat\", \"roomId\":\"%s\"}", room.getRoomId()))
                .build();
        try {
            notificationService.createPushNotification(request);
        } catch (Exception e) {
            log.warn("Failed to send invite notification to {}: {}", userId, e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberResponse> getRoomMembers(UUID roomId) {
        List<RoomMember> members = roomMemberRepository.findAllById_RoomIdAndIsDeletedFalse(roomId);

        return members.stream().map(m -> {
            User u = m.getUser();
            String displayName = u.getFullname();
            if (StringUtils.hasText(u.getNickname())) displayName = u.getNickname();
            if (StringUtils.hasText(m.getNickNameInRom())) displayName = m.getNickNameInRom();

            return MemberResponse.builder()
                    .userId(u.getUserId())
                    .fullname(u.getFullname())
                    .nickname(displayName)
                    .nickNameInRoom(m.getNickNameInRom())
                    .avatarUrl(u.getAvatarUrl())
                    .role(m.getRole().name())
                    .isAdmin(Boolean.TRUE.equals(m.getIsAdmin()))
                    .isOnline(u.isOnline())
                    .joinedAt(m.getJoinedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> getAiChatHistory(UUID userId) {
        try {
            if (userId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            List<Room> rooms = roomRepository.findByCreatorIdAndPurposeAndIsDeletedFalse(userId, RoomPurpose.AI_CHAT);

            return rooms.stream()
                    .sorted(Comparator.comparing(Room::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .map(room -> {
                        RoomResponse response = roomMapper.toResponse(room);
                        response.setMemberCount(1);
                        return response;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching AI chat history for user {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public RoomResponse findOrCreateAiChatRoom(UUID userId) {
        if (userId == null) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        List<Room> aiRooms = roomRepository.findByCreatorIdAndPurposeAndIsDeletedFalse(userId, RoomPurpose.AI_CHAT);
        aiRooms.sort(Comparator.comparing(Room::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        if (!aiRooms.isEmpty()) {
            Room latestRoom = aiRooms.get(0);

            Optional<ChatMessage> lastMessageOpt = chatMessageRepository.findFirstByRoomIdAndIsDeletedFalseOrderByIdSentAtDesc(latestRoom.getRoomId());

            if (lastMessageOpt.isPresent()) {
                ChatMessage lastMessage = lastMessageOpt.get();
                long hoursSinceLastMessage = ChronoUnit.HOURS.between(lastMessage.getId().getSentAt(), OffsetDateTime.now());

                if (hoursSinceLastMessage < 8) {
                    log.info("Reusing AI room {} (Last active {} hours ago)", latestRoom.getRoomId(), hoursSinceLastMessage);
                    return toRoomResponseWithMembers(latestRoom); // <-- Cập nhật để trả về response đầy đủ
                }
            } else {
                 long hoursSinceCreation = ChronoUnit.HOURS.between(latestRoom.getCreatedAt(), OffsetDateTime.now());
                 if (hoursSinceCreation < 8) {
                     return toRoomResponseWithMembers(latestRoom); // <-- Cập nhật để trả về response đầy đủ
                 }
            }
        }

        log.info("Creating new AI room for user {}", userId);
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        RoomRequest newRoomRequest = RoomRequest.builder()
                .roomName("AI Chat " + OffsetDateTime.now().toLocalDate())
                .creatorId(userId)
                .purpose(RoomPurpose.AI_CHAT)
                .roomType(RoomType.PRIVATE)
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

            // Hàm này bây giờ đã bao gồm logic tính toán online/offline và members
            return toRoomResponseWithMembers(room);
        } catch (Exception e) {
            log.error("Error while fetching room by ID {}: {}", id, e.getMessage());
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

    @Override
    @Transactional(readOnly = true)
    public RoomResponse getCourseRoomByCourseId(UUID courseId) {
        if (courseId == null) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        Room room = roomRepository.findByCourseIdAndIsDeletedFalse(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        // Hàm toRoomResponseWithMembers đã bao gồm memberCount, creator info (nếu cần) và members.
        RoomResponse response = toRoomResponseWithMembers(room);
        
        userRepository.findByUserIdAndIsDeletedFalse(room.getCreatorId())
                .ifPresent(creator -> {
                    response.setCreatorName(StringUtils.hasText(creator.getNickname()) ? creator.getNickname() : creator.getFullname());
                    response.setCreatorAvatarUrl(creator.getAvatarUrl());
                });

        return response;
    }

    @Transactional
    @Override
    public RoomResponse joinRoom(JoinRoomRequest request) {
        UUID userId = getCurrentUserUUID();
        if (userId == null) throw new AppException(ErrorCode.UNAUTHORIZED);

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
            return toRoomResponseWithMembers(room); // <-- Cập nhật để trả về response đầy đủ
        }

        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        RoomMember member = RoomMember.builder()
                .id(new RoomMemberId(room.getRoomId(), userId))
                .room(room)
                .user(user)
                .role(RoomRole.MEMBER)
                .isAdmin(false)
                .joinedAt(OffsetDateTime.now())
                .build();
        roomMemberRepository.save(member);

        // Cập nhật để trả về response đầy đủ thành viên
        return toRoomResponseWithMembers(room);
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

            UUID currentUserId = getCurrentUserUUID();
            if (currentUserId == null || !room.getCreatorId().equals(currentUserId)) {
                throw new AppException(ErrorCode.NOT_ROOM_CREATOR);
            }
            userRepository.findByUserIdAndIsDeletedFalse(request.getCreatorId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            roomMapper.updateEntityFromRequest(request, room);
            room = roomRepository.save(room);

            return toRoomResponseWithMembers(room);
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

            UUID currentUserId = getCurrentUserUUID();
            if (currentUserId == null || !room.getCreatorId().equals(currentUserId)) {
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
    public void removeRoomMembers(UUID roomId, List<UUID> userIds) {
        try {
            Room room = roomRepository.findByRoomIdAndIsDeletedFalse(roomId)
                    .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
            if (room.getPurpose() != RoomPurpose.GROUP_CHAT) {
                throw new AppException(ErrorCode.NOT_GROUP_CHAT);
            }
            UUID currentUserId = getCurrentUserUUID();
            if (currentUserId == null || !room.getCreatorId().equals(currentUserId)) {
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
        } else {
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
                return findOrCreateQuizRoom(userId);
            }

            RoomMember member = RoomMember.builder()
                    .id(memberId)
                    .room(roomToJoin)
                    .user(user)
                    .role(RoomRole.MEMBER)
                    .isAdmin(false)
                    .joinedAt(OffsetDateTime.now())
                    .build();
            roomMemberRepository.save(member);
        }

        return toRoomResponseWithMembers(roomToJoin);
    }
}