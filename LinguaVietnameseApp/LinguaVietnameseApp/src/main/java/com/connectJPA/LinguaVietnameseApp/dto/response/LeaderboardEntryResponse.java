package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LeaderboardEntryResponse {
    private LeaderboardEntryId leaderboardEntryId;
    private int score;
    private UUID userId;
    private String fullname;
    private String nickname;
    private String avatarUrl;
    private int level;
    private int exp;
    private String gender;
    private Integer rank;
    private Double change;
    private Integer streak;
    private boolean isDeleted;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static LeaderboardEntryResponse fromUser(User user) {
        return LeaderboardEntryResponse.builder()
                .userId(user.getUserId())
                .fullname(user.getFullname())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .level(user.getLevel())
                .exp(user.getExp())
                .build();
    }
}
