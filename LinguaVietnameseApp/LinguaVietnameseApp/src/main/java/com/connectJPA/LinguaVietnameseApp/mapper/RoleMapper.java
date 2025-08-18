package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.RoleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoleResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    RoleMapper INSTANCE = Mappers.getMapper(RoleMapper.class);

    Role toEntity(RoleRequest request);
    RoleResponse toResponse(Role entity);
    void updateEntityFromRequest(RoleRequest request, @MappingTarget Role entity);
}