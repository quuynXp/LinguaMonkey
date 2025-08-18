package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Couple;
import com.connectJPA.LinguaVietnameseApp.entity.id.CouplesId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CoupleRepository extends JpaRepository<Couple, CouplesId> {
    void deleteByIdUser1IdAndIdUser2Id(UUID user1Id, UUID user2Id);
    Optional<Couple> findByIdUser1IdAndIdUser2IdAndIsDeletedFalse(UUID user1Id, UUID user2Id);


    Page<Couple> findAllByIdUser1IdAndStatusAndIsDeletedFalse(UUID userId, String status, Pageable pageable);

}

