package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CoupleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CoupleResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Couple;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CoupleMapper {
    Couple toEntity(CoupleRequest request);
    CoupleResponse toResponse(Couple couple);
    void updateEntityFromRequest(CoupleRequest request, @MappingTarget Couple couple);
}