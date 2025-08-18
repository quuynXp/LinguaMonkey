package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.GroupAnswerRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.GroupAnswerResponse;
import com.connectJPA.LinguaVietnameseApp.entity.GroupAnswer;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface GroupAnswerMapper {
    GroupAnswer toEntity(GroupAnswerRequest request);
    GroupAnswerResponse toResponse(GroupAnswer groupAnswer);
    void updateEntityFromRequest(GroupAnswerRequest request, @MappingTarget GroupAnswer groupAnswer);
}
