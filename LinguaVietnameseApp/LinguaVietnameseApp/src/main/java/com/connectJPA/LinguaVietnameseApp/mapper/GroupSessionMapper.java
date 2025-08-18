package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.GroupSessionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.GroupSessionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.GroupSession;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import java.lang.annotation.Target;

@Mapper(componentModel = "spring")
public interface GroupSessionMapper {
    GroupSession toEntity(GroupSessionRequest request);
    GroupSessionResponse toResponse(GroupSession session);
    void updateEntityFromRequest(GroupSessionRequest request, @MappingTarget() GroupSession session);
}
