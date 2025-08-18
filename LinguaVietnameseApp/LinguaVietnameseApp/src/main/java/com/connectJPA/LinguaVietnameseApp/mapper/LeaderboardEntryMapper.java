package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardEntryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LeaderboardEntryMapper {
    LeaderboardEntryMapper INSTANCE = Mappers.getMapper(LeaderboardEntryMapper.class);

    LeaderboardEntry toEntity(LeaderboardEntryRequest request);
    LeaderboardEntryResponse toResponse(LeaderboardEntry entity);
    void updateEntityFromRequest(LeaderboardEntryRequest request, @MappingTarget LeaderboardEntry entity);
}