package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Data;

@Data
public class UserCountResponse {
    private String period;
    private long newUsers;
    private long totalUsers;
}