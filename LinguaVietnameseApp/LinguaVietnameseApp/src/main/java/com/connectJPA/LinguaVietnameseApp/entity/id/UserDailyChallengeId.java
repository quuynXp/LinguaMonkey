package com.connectJPA.LinguaVietnameseApp.entity.id;

import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import jakarta.persistence.Embeddable;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import okhttp3.Challenge;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Embeddable
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserDailyChallengeId implements Serializable {
    private UUID userId;
    private UUID challengeId;

    private OffsetDateTime assignedDate;
    private int stack;
}

