package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserCountResponse {
    private String period;
    private long newUsers;
    private long totalUsers;
}