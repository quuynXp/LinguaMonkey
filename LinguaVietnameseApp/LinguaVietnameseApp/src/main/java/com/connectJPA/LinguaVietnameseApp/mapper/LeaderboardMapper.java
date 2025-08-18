package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Leaderboard;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LeaderboardMapper {
    LeaderboardMapper INSTANCE = Mappers.getMapper(LeaderboardMapper.class);

    Leaderboard toEntity(LeaderboardRequest request);
    LeaderboardResponse toResponse(Leaderboard entity);
    void updateEntityFromRequest(LeaderboardRequest request, @MappingTarget Leaderboard entity);
}