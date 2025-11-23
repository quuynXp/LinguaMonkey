package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User , UUID>, JpaSpecificationExecutor<User> {

    long countByCreatedAtBetween(OffsetDateTime startDate, OffsetDateTime endDate);

    @Query("SELECT u FROM User u WHERE (" +
            "LOWER(u.fullname) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
            ") AND u.isDeleted = false")
    Page<User> searchUsersByKeyword(@Param("keyword") String keyword, Pageable pageable);

    Optional<User> findByEmailOrPhoneAndIsDeletedFalse(String email, String phone);
    List<User> findByCreatedAtBetween(OffsetDateTime startDate, OffsetDateTime endDate);

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    Optional<User> findByPhoneAndIsDeletedFalse(String phone);
    List<User> findAllByIsDeletedFalse();

     @Query("SELECT u FROM User u WHERE (u.email = :identifier OR u.phone = :identifier) AND u.isDeleted = false")
     Optional<User> findByIdentifier(@Param("identifier") String identifier);

    boolean existsByEmailIgnoreCaseAndIsDeletedFalse(String email);
    Optional<User> findByEmailIgnoreCaseAndIsDeletedFalse(String email);


    boolean existsByEmailAndIsDeletedFalse(String email);
    boolean existsByPhoneAndIsDeletedFalse(String phone);
    boolean existsByUserIdAndIsDeletedFalse(UUID userId);

    @Query("SELECT u FROM User u WHERE u.email LIKE %:email% AND u.fullname LIKE %:fullname% AND u.nickname LIKE %:nickname% AND u.isDeleted = false")
    Page<User> findByEmailContainingAndFullnameContainingAndNicknameContainingAndIsDeletedFalse(
            @Param("email") String email, @Param("fullname") String fullname, @Param("nickname") String nickname, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.userId = :id AND u.isDeleted = false")
    Optional<User> findByUserIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE User u SET u.isDeleted = true, u.deletedAt = CURRENT_TIMESTAMP WHERE u.userId = :id AND u.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    List<User> findByIsDeletedFalseOrderByExpDesc(Pageable pageable);
}
