package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.Character3dRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.Character3dResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Character3d;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface Character3dMapper {
    Character3d toEntity(Character3dRequest request);
    Character3dResponse toResponse(Character3d character);
    void updateEntityFromRequest(Character3dRequest request, @MappingTarget Character3d character);
}