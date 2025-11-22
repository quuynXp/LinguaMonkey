package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.response.UserDailyChallengeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserDailyChallengeMapper {

    @Mapping(source = "id.userId", target = "userId")
    @Mapping(source = "id.challengeId", target = "challengeId")
    @Mapping(source = "challenge.title", target = "title")
    @Mapping(source = "challenge.description", target = "description")
    UserDailyChallengeResponse toResponse(UserDailyChallenge entity);
}