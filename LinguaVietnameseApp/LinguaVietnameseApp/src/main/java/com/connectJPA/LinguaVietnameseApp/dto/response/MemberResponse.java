package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberResponse {
    private UUID userId;
    private String fullname; // Hoặc fullName
    private String avatarUrl;
    private String nickname;
    private String role; // Ví dụ: "ADMIN", "MEMBER"
    private boolean isOnline; // Bạn cần thêm logic để xác định điều này
}