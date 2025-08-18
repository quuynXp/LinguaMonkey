package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface BadgeMapper {
    Badge toEntity(BadgeRequest request);
    BadgeResponse toResponse(Badge badge);
    void updateEntityFromRequest(BadgeRequest request, @MappingTarget Badge badge);
}