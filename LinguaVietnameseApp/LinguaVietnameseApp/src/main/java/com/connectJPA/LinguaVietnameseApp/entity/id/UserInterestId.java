package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import lombok.*;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserInterestId implements Serializable {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "interest_id")
    private UUID interestId;
}