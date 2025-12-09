package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserProfileResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    // ==========================================================
    // 1. REQUEST -> ENTITY (Tạo mới User)
    // ==========================================================
    
    // ... (Giữ nguyên các mappings toEntity)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "isDeleted", ignore = true) 
    
    @Mapping(target = "lastActiveAt", ignore = true)
    @Mapping(target = "hasFinishedSetup", ignore = true)
    @Mapping(target = "hasDonePlacementTest", ignore = true)
    @Mapping(target = "lastDailyWelcomeAt", ignore = true)
    @Mapping(target = "minLearningDurationMinutes", ignore = true)
    @Mapping(target = "lastStreakCheckDate", ignore = true)
    @Mapping(target = "coins", ignore = true) 
    @Mapping(target = "vipExpirationDate", ignore = true)
    @Mapping(target = "latestImprovementSuggestion", ignore = true)
    @Mapping(target = "lastSuggestionGeneratedAt", ignore = true)
    @Mapping(target = "userSettings", ignore = true)
    
    User toEntity(UserRequest request);


    // ==========================================================
    // 2. ENTITY -> RESPONSE (Hiển thị User)
    // ==========================================================

    @Mapping(target = "isVip", expression = "java(entity.isVip())")
    @Mapping(target = "badgeId", ignore = true)
    @Mapping(target = "authProvider", ignore = true)
    @Mapping(target = "certificationIds", ignore = true)
    @Mapping(target = "interestIds", ignore = true)
    @Mapping(target = "goalIds", ignore = true)
    @Mapping(target = "languages", ignore = true)
    @Mapping(target = "coupleProfile", ignore = true) 
    @Mapping(target = "expToNextLevel", ignore = true)
    @Mapping(target = "progress", ignore = true)
    UserResponse toResponse(User entity);
    
    
    // ==========================================================
    // 3. ENTITY -> PROFILE RESPONSE (Hiển thị chi tiết User Profile)
    // ==========================================================
    
    // FIX THE ERROR HERE: Convert long result from ChronoUnit.YEARS.between to Integer
    @Mapping(target = "age", expression = "java(entity.getDayOfBirth() != null ? (int) java.time.temporal.ChronoUnit.YEARS.between(entity.getDayOfBirth(), java.time.LocalDate.now()) : null)")
    @Mapping(target = "isVip", expression = "java(entity.isVip())")
    @Mapping(target = "isOnline", expression = "java(entity.isOnline())")
    @Mapping(target = "vipDaysRemaining", ignore = true)
    @Mapping(target = "lastActiveText", ignore = true)
    @Mapping(target = "flag", ignore = true)
    @Mapping(target = "character3d", ignore = true)
    @Mapping(target = "stats", ignore = true)
    @Mapping(target = "badges", ignore = true)
    @Mapping(target = "isFriend", ignore = true)
    @Mapping(target = "friendshipDurationDays", ignore = true)
    @Mapping(target = "friendRequestStatus", ignore = true)
    @Mapping(target = "canSendFriendRequest", ignore = true)
    @Mapping(target = "canUnfriend", ignore = true)
    @Mapping(target = "canBlock", ignore = true)
    @Mapping(target = "allowStrangerChat", ignore = true)
    @Mapping(target = "privateFriendRequests", ignore = true)
    @Mapping(target = "privateDatingInvites", ignore = true)
    @Mapping(target = "admirationCount", ignore = true)
    @Mapping(target = "hasAdmired", ignore = true)
    @Mapping(target = "isTeacher", ignore = true)
    @Mapping(target = "teacherCourses", ignore = true)
    @Mapping(target = "leaderboardRanks", ignore = true)
    @Mapping(target = "coupleInfo", ignore = true)
    @Mapping(target = "mutualMemories", ignore = true)
    @Mapping(target = "datingInviteSummary", ignore = true)
    @Mapping(target = "exploringExpiresInHuman", ignore = true)
    @Mapping(target = "exploringExpiringSoon", ignore = true)
    @Mapping(target = "authProvider", ignore = true)
    @Mapping(target = "badgeId", ignore = true)
    @Mapping(target = "progress", ignore = true)
    @Mapping(target = "expToNextLevel", ignore = true)
    @Mapping(target = "certificationIds", ignore = true)
    @Mapping(target = "interestIds", ignore = true)
    @Mapping(target = "goalIds", ignore = true)
    @Mapping(target = "languages", ignore = true)
    
    UserProfileResponse toProfileResponse(User entity);


    // ==========================================================
    // 4. UPDATE ENTITY (Cập nhật User)
    // ==========================================================
    
    // ... (Giữ nguyên các mappings updateEntityFromRequest)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "vipExpirationDate", ignore = true)
    @Mapping(target = "coins", ignore = true)
    @Mapping(target = "level", ignore = true)
    @Mapping(target = "exp", ignore = true)
    @Mapping(target = "streak", ignore = true)
    @Mapping(target = "lastActiveAt", ignore = true)
    @Mapping(target = "latestImprovementSuggestion", ignore = true)
    @Mapping(target = "lastSuggestionGeneratedAt", ignore = true)
    @Mapping(target = "userSettings", ignore = true)
    
    @Mapping(target = "hasFinishedSetup", ignore = true)
    @Mapping(target = "hasDonePlacementTest", ignore = true)
    @Mapping(target = "lastDailyWelcomeAt", ignore = true)
    @Mapping(target = "minLearningDurationMinutes", ignore = true)
    @Mapping(target = "lastStreakCheckDate", ignore = true)
    void updateEntityFromRequest(UserRequest request, @MappingTarget User entity);
}