package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.NotificationResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface NotificationMapper {
    NotificationMapper INSTANCE = Mappers.getMapper(NotificationMapper.class);

    Notification toEntity(NotificationRequest request);
    NotificationResponse toResponse(Notification entity);
    void updateEntityFromRequest(NotificationRequest request, @MappingTarget Notification entity);
}