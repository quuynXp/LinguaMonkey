package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.AgeRange;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
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

        @Query("SELECT COUNT(u) FROM User u WHERE u.lastActiveAt >= :threshold AND u.isDeleted = false")
    long countOnlineUsers(@Param("threshold") OffsetDateTime threshold);
    
    long countByCreatedAtBetween(OffsetDateTime startDate, OffsetDateTime endDate);

    @Query("SELECT u FROM User u WHERE (" +
            "LOWER(u.fullname) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
            ") AND u.isDeleted = false")
    Page<User> searchUsersByKeyword(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT DISTINCT u FROM User u JOIN u.userSettings s WHERE " +
            "u.isDeleted = false " +
            "AND s.searchPrivacy = true " +
            "AND (:keyword IS NULL OR :keyword = '' OR (" +
            "   LOWER(u.fullname) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "   LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "   LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "   u.phone LIKE CONCAT('%', :keyword, '%')" +
            ")) " +
            "AND (:country IS NULL OR u.country = :country) " +
            "AND (:gender IS NULL OR :gender = '' OR LOWER(u.gender) = LOWER(:gender)) " +
            "AND (:ageRange IS NULL OR u.ageRange = :ageRange)")
    Page<User> searchAdvanced(
            @Param("keyword") String keyword,
            @Param("country") Country country,
            @Param("gender") String gender,
            @Param("ageRange") AgeRange ageRange,
            Pageable pageable
    );

    List<User> findAllByIsDeletedFalse();
    Optional<User> findByEmailOrPhoneAndIsDeletedFalse(String email, String phone);
    List<User> findByCreatedAtBetween(OffsetDateTime startDate, OffsetDateTime endDate);

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    Optional<User> findByPhoneAndIsDeletedFalse(String phone);

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

    @Query("SELECT u FROM User u WHERE u.userId != :currentUserId " +
           "AND u.isDeleted = false " +
           "AND (u.country = :country OR u.nativeLanguageCode = :nativeLang OR u.ageRange = :ageRange) " +
           "AND u.userId NOT IN (SELECT f.id.receiverId FROM Friendship f WHERE f.id.requesterId = :currentUserId) " +
           "AND u.userId NOT IN (SELECT f.id.requesterId FROM Friendship f WHERE f.id.receiverId = :currentUserId)")
    Page<User> findSuggestedUsers(@Param("currentUserId") UUID currentUserId,
                                  @Param("country") Object country, 
                                  @Param("nativeLang") String nativeLang,
                                  @Param("ageRange") Object ageRange,
                                  Pageable pageable);
                                  
    @Query("SELECT u FROM User u WHERE u.vipExpirationDate BETWEEN :start AND :end AND u.isDeleted = false")
    List<User> findByVipExpirationDateBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
}