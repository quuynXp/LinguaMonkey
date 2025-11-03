package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.response.WalletResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Wallet;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface WalletMapper {

    @Mapping(source = "user.userId", target = "userId")
    WalletResponse toResponse(Wallet wallet);
}
