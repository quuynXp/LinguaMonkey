package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.response.UserDailyChallengeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserDailyChallengeMapper {
    
    // 1. Map ID và User
    @Mapping(target = "challengeId", source = "challenge.id")
    @Mapping(target = "userId", source = "id.userId")

    // 2. Map thông tin tĩnh từ bảng cha (DailyChallenge)
    // Những trường này Service KHÔNG copy sang bảng con, nên phải lấy từ "challenge.*"
    @Mapping(target = "title", source = "challenge.title")
    @Mapping(target = "description", source = "challenge.description")
    @Mapping(target = "period", source = "challenge.period")         // Fix lỗi thiếu Period
    @Mapping(target = "screenRoute", source = "challenge.screenRoute") // Fix lỗi Navigation
    @Mapping(target = "stack", source = "challenge.stack")           // Fix lỗi Navigation
    
    // 3. Map tiến độ từ bảng con (UserDailyChallenge)
    // Map tường minh để đảm bảo không bị lỗi 0/0
    @Mapping(target = "progress", source = "progress")
    @Mapping(target = "targetAmount", source = "targetAmount")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "completed", source = "completed") // Map getter isCompleted() -> completed
    
    // 4. Map phần thưởng (Service đã copy sang bảng con nên lấy từ entity gốc)
    @Mapping(target = "expReward", source = "expReward")
    @Mapping(target = "rewardCoins", source = "rewardCoins")
    
    // 5. Map thời gian
    @Mapping(target = "assignedAt", source = "assignedAt")
    @Mapping(target = "completedAt", source = "completedAt")

    UserDailyChallengeResponse toResponse(UserDailyChallenge entity);
}