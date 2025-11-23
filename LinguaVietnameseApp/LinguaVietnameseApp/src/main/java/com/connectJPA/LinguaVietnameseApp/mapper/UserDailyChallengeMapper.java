package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.response.UserDailyChallengeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserDailyChallengeMapper {
    UserDailyChallengeResponse toResponse(UserDailyChallenge entity);
}