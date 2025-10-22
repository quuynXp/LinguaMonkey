package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.VideoCallRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoCallResponse;
import com.connectJPA.LinguaVietnameseApp.entity.VideoCall;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface VideoCallMapper {

    VideoCall toEntity(VideoCallRequest request);
    VideoCallResponse toResponse(VideoCall entity);
    void updateEntityFromRequest(VideoCallRequest request, @MappingTarget VideoCall entity);
}