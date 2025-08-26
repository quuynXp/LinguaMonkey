package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionProvider;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Transaction extends BaseEntity {
    @Id
    @Column(name = "transaction_id")
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID transactionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private TransactionStatus status;

    @Column(name = "provider", nullable = false)
    @Enumerated(EnumType.STRING)
    private TransactionProvider provider;

    @Column(name = "description")
    private String description;

    private String currency;
}
