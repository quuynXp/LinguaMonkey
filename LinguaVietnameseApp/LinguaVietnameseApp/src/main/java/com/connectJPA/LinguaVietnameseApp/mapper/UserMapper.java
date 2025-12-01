package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

// unmappedTargetPolicy = ReportingPolicy.IGNORE: Tùy chọn này giúp ẩn các cảnh báo nếu bạn lười ignore từng cái
// Nhưng tốt nhất vẫn nên ignore rõ ràng như bên dưới để kiểm soát code
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    // ==========================================================
    // 1. REQUEST -> ENTITY (Tạo mới User)
    // ==========================================================
    
    // Các trường hệ thống tự sinh hoặc có giá trị mặc định -> IGNORE
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "isDeleted", ignore = true) // BaseEntity thường là isDeleted hoặc deleted
    
    // Các trường logic business mặc định khi tạo mới -> IGNORE
    @Mapping(target = "lastActiveAt", ignore = true)
    @Mapping(target = "hasFinishedSetup", ignore = true) // Mặc định là false trong Entity
    @Mapping(target = "hasDonePlacementTest", ignore = true) // Mặc định là false
    @Mapping(target = "lastDailyWelcomeAt", ignore = true)
    @Mapping(target = "minLearningDurationMinutes", ignore = true)
    @Mapping(target = "lastStreakCheckDate", ignore = true)
    @Mapping(target = "coins", ignore = true) // Mặc định 0
    @Mapping(target = "vipExpirationDate", ignore = true) // Xử lý logic nạp VIP riêng
    
    // Các trường có trong Request nhưng chưa có trong Entity (xử lý ở Service) -> IGNORE
    // Ví dụ: interestIds, certificationIds, goalIds... Entity User của bạn không chứa List này
    // MapStruct sẽ tự động bỏ qua các trường trong Source mà Target không có, 
    // nhưng ta đang xử lý "Unmapped TARGET properties" nên phần này không gây lỗi ở đây.
    User toEntity(UserRequest request);


    // ==========================================================
    // 2. ENTITY -> RESPONSE (Hiển thị User)
    // ==========================================================

    @Mapping(target = "isVip", expression = "java(entity.isVip())") // Map method isVip() sang field boolean
    @Mapping(target = "badgeId", ignore = true)         // Cần query bảng UserBadge
    @Mapping(target = "authProvider", ignore = true)    // Entity chưa có field này
    @Mapping(target = "certificationIds", ignore = true) // Cần query bảng Certification
    @Mapping(target = "interestIds", ignore = true)      // Cần query bảng UserInterest
    @Mapping(target = "goalIds", ignore = true)          // Cần query bảng UserGoal
    @Mapping(target = "languages", ignore = true)        // Cần query bảng UserLanguage
    @Mapping(target = "coupleProfile", ignore = true)    // Cần query bảng Couple
    
    // Các trường logic game/level -> IGNORE (Nếu Entity chưa tính sẵn)
    @Mapping(target = "expToNextLevel", ignore = true)   // Cần tính toán dựa trên level
    @Mapping(target = "progress", ignore = true)         // Cần tính toán
    UserResponse toResponse(User entity);


    // ==========================================================
    // 3. UPDATE ENTITY (Cập nhật User)
    // ==========================================================
    
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    
    // Các trường không cho phép update qua API này
    @Mapping(target = "fullname", ignore = true)        // Nếu muốn update fullname thì bỏ dòng này
    @Mapping(target = "vipExpirationDate", ignore = true)
    @Mapping(target = "coins", ignore = true)
    @Mapping(target = "level", ignore = true)
    @Mapping(target = "exp", ignore = true)
    @Mapping(target = "streak", ignore = true)
    @Mapping(target = "lastActiveAt", ignore = true)
    
    // Các trường config hệ thống giữ nguyên
    @Mapping(target = "hasFinishedSetup", ignore = true)
    @Mapping(target = "hasDonePlacementTest", ignore = true)
    @Mapping(target = "lastDailyWelcomeAt", ignore = true)
    @Mapping(target = "minLearningDurationMinutes", ignore = true)
    @Mapping(target = "lastStreakCheckDate", ignore = true)
    void updateEntityFromRequest(UserRequest request, @MappingTarget User entity);
}