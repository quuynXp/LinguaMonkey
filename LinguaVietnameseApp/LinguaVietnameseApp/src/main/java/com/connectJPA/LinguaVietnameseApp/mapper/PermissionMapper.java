package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.PermissionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.PermissionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Permission;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    PermissionMapper INSTANCE = Mappers.getMapper(PermissionMapper.class);

    Permission toEntity(PermissionRequest request);
    PermissionResponse toResponse(Permission entity);
    void updateEntityFromRequest(PermissionRequest request, @MappingTarget Permission entity);
}