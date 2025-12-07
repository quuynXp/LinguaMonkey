package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.TransactionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserProfileResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface TransactionMapper {

    @Mapping(target = "transactionId", ignore = true)
    @Mapping(target = "isDeleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "user", ignore = true) // User is set manually in service usually, or mapped via userId
    Transaction toEntity(TransactionRequest request);

    @Mapping(target = "user", source = "user", qualifiedByName = "mapUserToProfile")
    TransactionResponse approveRefundtoResponse(Transaction transaction);

    @Mapping(target = "user", source = "user", qualifiedByName = "mapUserToProfile")
    TransactionResponse toResponse(Transaction transaction);

    @Mapping(target = "transactionId", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    void updateEntityFromRequest(TransactionRequest request, @MappingTarget Transaction transaction);

    @Named("mapUserToProfile")
    default UserProfileResponse mapUserToProfile(User user) {
        if (user == null) {
            return null;
        }
        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .fullname(user.getFullname())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .level(user.getLevel())
                .isVip(user.isVip())
                .build();
    }
}