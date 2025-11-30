package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MemberResponse {
    private UUID userId;
    private String nickname; // Calculated: NicknameInRoom > Nickname > Fullname
    private String fullname;
    private String avatarUrl;
    private String role;
    private boolean isOnline;
    
    // Extra info
    private boolean isAdmin;
    private String nickNameInRoom; // Raw value

    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime joinedAt;
}