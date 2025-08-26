package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserInterestId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "user_interests")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class UserInterest extends BaseEntity {
    @EmbeddedId
    private UserInterestId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("interestId")
    @JoinColumn(name = "interest_id")
    private Interest interest;
}