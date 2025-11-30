package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.FriendshipRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendshipResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Friendship;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", uses = {UserMapper.class}, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface FriendshipMapper {
    
    // --- Mapping Request to Entity ---
    @Mapping(target = "id.requesterId", source = "requesterId")
    @Mapping(target = "id.receiverId", source = "receiverId")
    @Mapping(target = "requester", ignore = true) 
    @Mapping(target = "receiver", ignore = true)
    Friendship toEntity(FriendshipRequest request);
    
    // --- Mapping Entity to Response ---
    @Mapping(target = "id", ignore = true) 
    @Mapping(target = "requesterId", source = "id.requesterId")
    @Mapping(target = "receiverId", source = "id.receiverId")
    @Mapping(target = "requester", source = "requester")
    @Mapping(target = "receiver", source = "receiver")
    FriendshipResponse toResponse(Friendship entity);

    // --- Update Entity from Request ---
    @Mapping(target = "id", ignore = true) // Không update composite key object
    @Mapping(target = "requester", ignore = true) // Không update User entity
    @Mapping(target = "receiver", ignore = true) // Không update User entity
    @Mapping(target = "id.requesterId", source = "requesterId")
    @Mapping(target = "id.receiverId", source = "receiverId")
    void updateEntityFromRequest(FriendshipRequest request, @MappingTarget Friendship friendship);
}