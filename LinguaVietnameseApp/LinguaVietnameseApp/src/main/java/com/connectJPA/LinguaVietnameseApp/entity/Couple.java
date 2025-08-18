package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.CouplesId;
import com.connectJPA.LinguaVietnameseApp.enums.CoupleStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "couples")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Couple extends BaseEntity {
    @EmbeddedId
    private CouplesId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CoupleStatus status = CoupleStatus.PENDING;

}
