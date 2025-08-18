package com.connectJPA.LinguaVietnameseApp.repository;


import com.connectJPA.LinguaVietnameseApp.entity.Character3d;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface Character3dRepository extends JpaRepository<Character3d, UUID> {
    @Query(value = "SELECT * FROM character3ds WHERE character3d_name LIKE %:character3dName% AND deleted = false LIMIT :limit OFFSET :offset",
            countQuery = "SELECT COUNT(*) FROM character3ds WHERE character3d_name LIKE %:character3dName% AND deleted = false",
            nativeQuery = true)
    Page<Character3d> findByCharacter3dNameContainingAndIsDeletedFalse(@Param("character3dName") String character3dName, Pageable pageable);

    @Query(value = "SELECT * FROM character3ds WHERE character3d_id = :id AND deleted = false", nativeQuery = true)
    Optional<Character3d> findByCharacter3dIdAndIsDeletedFalse(@Param("id") UUID id);
}

