package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.response.MemorizationResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserMemorization;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMemorizationMapper {
    MemorizationResponse toResponse(UserMemorization entity);
}