package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.FriendshipRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendshipResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Friendship;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface FriendshipMapper {
    Friendship toEntity(FriendshipRequest request);
    FriendshipResponse toResponse(Friendship friendship);
    void updateEntityFromRequest(FriendshipRequest request, @MappingTarget Friendship friendship);
}
