package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class UserRoleRequest {
    private UUID roleId;
    private UUID userId;
    private boolean isDeleted;
}
