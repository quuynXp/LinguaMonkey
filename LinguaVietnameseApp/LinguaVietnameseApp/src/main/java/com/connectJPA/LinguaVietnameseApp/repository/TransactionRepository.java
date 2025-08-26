package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    @Query("SELECT t FROM Transaction t WHERE " +
            "(:userId IS NULL OR t.userId = :userId) AND " +
            "(:status IS NULL OR t.status = :status) AND " +
            "t.isDeleted = false")
    Page<Transaction> findByUserIdAndStatusAndIsDeletedFalse(
            @Param("userId") UUID userId,
            @Param("status") TransactionStatus status,
            Pageable pageable);

    Optional<Transaction> findByTransactionIdAndIsDeletedFalse(UUID transactionId);

    @Modifying
    @Query("UPDATE Transaction t SET t.isDeleted = true, t.deletedAt = CURRENT_TIMESTAMP WHERE t.transactionId = :transactionId")
    void softDeleteByTransactionId(@Param("transactionId") UUID transactionId);

    List<Transaction> findByCreatedAtBetween(OffsetDateTime startDate, OffsetDateTime endDate);

    List<Transaction> findByUserIdAndCreatedAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

}