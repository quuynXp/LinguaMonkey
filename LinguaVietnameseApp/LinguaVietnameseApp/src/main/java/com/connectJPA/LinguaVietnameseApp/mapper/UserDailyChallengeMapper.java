package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.response.UserDailyChallengeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserDailyChallengeMapper {
    @Mapping(target = "challengeId", source = "challenge.id")
    @Mapping(target = "title", source = "challenge.title")
    @Mapping(target = "description", source = "challenge.description")
    @Mapping(target = "userId", source = "id.userId")
    UserDailyChallengeResponse toResponse(UserDailyChallenge entity);
}